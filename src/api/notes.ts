import {
  AppError,
  DebounceQueue,
  EncryptedDeletedNote,
  EncryptedNote,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
  Note,
  NoteContent,
  TokenStore,
} from '../classes';
import {
  addNotes,
  dispatchNoteEvent,
  findNote,
  newNote,
  noteState,
  selectNote,
  syncLocalNotes,
} from '../store/note';
import { applyDiffToEncryptedNotesCache, resetAppError, syncState } from '../store/sync';
import { isEmptyNote, tauriEmit } from '../utils';

import {
  parseErrorRes,
  resIsOk,
  throwAuthorisationError,
  throwEncryptorError,
  throwFetchError,
} from './utils';
import { createRoute } from './utils/route';

const route = createRoute(syncState);

const syncQueue = new DebounceQueue();

// Sync
export const sync = route(async (isCancelled?: () => boolean) => {
  const errorConfig: ErrorConfig = {
    code: ERROR_CODE.SYNC,
    retry: {
      fn: () => {
        // Add back to the queue, so `isCancelled` can be checked again.
        // Outer `isCancelled` will always be `true` from this point.
        syncQueue.add((ic) => sync(ic));
      },
    },
    display: { sync: true },
  };

  // This shouldn't happen, but just in case
  if (!syncState.username) {
    throwAuthorisationError({
      ...errorConfig,
      retry: undefined,
    });
  }

  const [accessToken, passwordKey] = await Promise.all([
    TokenStore.getAccessToken(syncState.username),
    KeyStore.getKey(),
  ]).catch((err) => throwAuthorisationError(errorConfig, err));
  if (isCancelled?.()) return;

  if (!accessToken || !passwordKey) {
    throwAuthorisationError(errorConfig);
  }

  // Encrypt any edited or deleted notes that haven't already been encrypted
  const notesToEncrypt = noteState.notes.filter((nt) => {
    const noteIsEdited = syncState.unsyncedNotes.edited.has(nt.uuid);
    const noteIsCached = syncState.encryptedNotesCache.has(nt.uuid);

    return (noteIsEdited || !noteIsCached) && !isEmptyNote(nt);
  });

  // Deleted notes should already be cached, but just in case
  const deletedNotesToEncrypt = noteState.deletedNotes.filter((nt) => {
    return !syncState.encryptedNotesCache.has(nt.uuid);
  });

  const [encryptedNotes, encryptedDeletedNotes] = await Promise.all([
    Encryptor.encryptNotes(notesToEncrypt, passwordKey),
    Encryptor.encryptNotes(deletedNotesToEncrypt, passwordKey),
  ]).catch((err) => throwEncryptorError(errorConfig, err));
  if (isCancelled?.()) return;

  // Add to encrypted notes cache
  [...encryptedNotes, ...encryptedDeletedNotes].forEach((nt) => {
    syncState.encryptedNotesCache.set(nt.uuid, nt.content);
  });

  const res = await new FetchBuilder('/notes/sync')
    .method('PUT')
    .withAuth(syncState.username, accessToken)
    .body({
      notes: encryptedNotes,
      deleted_notes: encryptedDeletedNotes,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
  if (isCancelled?.()) return;

  if (resIsOk(res)) {
    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    // Users' session must still be valid
    syncState.isLoggedIn = true;

    applyDiffToEncryptedNotesCache(res.data.note_diff);

    const decryptedNotes = await Promise.all([
      Encryptor.decryptNotes(res.data.note_diff.added, passwordKey),
      Encryptor.decryptNotes(res.data.note_diff.edited, passwordKey),
    ]).catch((err) => throwEncryptorError(errorConfig, err));
    if (isCancelled?.()) return;

    await updateLocalNoteStateFromDiff({
      added: decryptedNotes[0],
      edited: decryptedNotes[1],
      deleted: res.data.note_diff.deleted,
    });
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// TODO: add get deleted notes route handler

// TODO: move this to a separate file
/**
 * Updates local note state based on the given diff.
 */
export function updateLocalNoteStateFromDiff(noteDiff: DecryptedNoteDiff) {
  let selectedNoteIsDeleted = false;
  let remoteSelectedNote;

  // Resolve edited and deleted note conflicts
  for (let i = noteState.notes.length - 1; i >= 0; i -= 1) {
    const ln = noteState.notes[i]!;
    const isSelectedNote = ln.uuid === noteState.selectedNote.uuid;

    // Remove notes that were deleted on the server
    if (noteDiff.deleted.some((dn) => dn.uuid === ln.uuid)) {
      noteState.notes.splice(i, 1);

      if (isSelectedNote) {
        selectedNoteIsDeleted = true;
      }

      continue;
    }

    // Update existing notes
    const foundRemoteNoteIndex = noteDiff.edited.findIndex((rn) => rn.uuid === ln.uuid);

    if (foundRemoteNoteIndex > -1) {
      noteState.notes[i] = noteDiff.edited[foundRemoteNoteIndex]!;

      noteDiff.edited.splice(foundRemoteNoteIndex, 1);

      if (isSelectedNote) {
        remoteSelectedNote = noteState.notes[i];
      }
    }
  }

  // Add new notes from the server
  addNotes(noteDiff.added);

  // New note if no notes exist
  if (noteState.notes.length === 0) {
    newNote();
  }
  // Select next note if current selected note was deleted
  else if (selectedNoteIsDeleted) {
    selectNote(noteState.notes[0]!.uuid);
  }
  // Update selected note if edited and ensure editor updates
  else if (remoteSelectedNote) {
    noteState.selectedNote.content = remoteSelectedNote.content;
    noteState.selectedNote.timestamp = remoteSelectedNote.timestamp;

    dispatchNoteEvent('note-change');
  }
  // Select next note if current selected note is empty and not deliberately created
  else if (noteState.notes.length > 1 && !syncState.unsyncedNotes.new) {
    const foundNote = findNote(noteState.selectedNote.uuid);
    const isInDeleted = syncState.unsyncedNotes.deleted.some(
      (nt) => nt.uuid === noteState.selectedNote.uuid
    );

    if (!foundNote || (isEmptyNote(foundNote) && !isInDeleted)) {
      selectNote(noteState.notes[1]!.uuid);
    }
  }

  syncState.unsyncedNotes.clear();

  return syncLocalNotes(noteState.notes);
}

/**
 * Queues a sync call and returns a promise that completes once the sync call has completed.
 */
export function queueSync(options?: { withDelay?: boolean }): Promise<void> {
  return new Promise((res) => {
    syncQueue.add(
      (isCancelled) => {
        return sync(isCancelled).finally(res);
      },
      options?.withDelay ? 500 : undefined
    );
  });
}

/**
 * Queues a sync call to be run after a short delay.
 */
export function debounceSync(): Promise<void> {
  if (!syncState.isLoggedIn) return Promise.resolve();

  return queueSync({ withDelay: true });
}

//// Types

export type NoteDiff = {
  added: EncryptedNote[];
  edited: EncryptedNote[];
  deleted: EncryptedDeletedNote[];
};

export type DecryptedNoteDiff = {
  added: Note[];
  edited: Note[];
  deleted: EncryptedDeletedNote[];
};

export type DeletedNote = {
  uuid: string;
  deleted_at: number;
  deleted_permanently: boolean;
  content: NoteContent;
};
