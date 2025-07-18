import {
  AppError,
  DebounceQueue,
  EncryptedNote,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
} from '../classes';
import { NOTE_EVENTS } from '../constant';
import {
  findNote,
  newNote,
  Note,
  noteState,
  selectNote,
  sortStateNotes,
  UnsyncedEventDetail,
} from '../store/note';
import { resetAppError, syncState } from '../store/sync';
import { isEmptyNote, tauriEmit, tauriInvoke } from '../utils';

import { clientSideLogout } from './auth';
import {
  parseErrorRes,
  resIsOk,
  route,
  throwEncryptorError,
  throwFetchError,
} from './utils';

const syncQueue = new DebounceQueue();

// Sync
export const sync = route(async (isCancelled?: () => boolean) => {
  if (!syncState.username) {
    return clientSideLogout();
  }

  const errorConfig = {
    code: ERROR_CODE.SYNC,
    retry: {
      fn: () => {
        // Add back to the queue, so `isCancelled` can be checked again.
        // Outer `isCancelled` will always be `true` from this point.
        syncQueue.add((ic) => sync(ic));
      },
    },
    display: { sync: true },
  } satisfies Omit<ErrorConfig<typeof sync | (() => void)>, 'message'>;

  const passwordKey = await KeyStore.getKey();
  if (isCancelled?.()) return;

  if (!passwordKey) {
    return clientSideLogout();
  }

  const notesToEncrypt = noteState.notes.filter((nt) => {
    const noteIsEdited = syncState.unsyncedNotes.edited.has(nt.uuid);
    const noteIsCached = syncState.encryptedNotesCache.has(nt.uuid);

    return (noteIsEdited || !noteIsCached) && !isEmptyNote(nt);
  });

  const [accessToken, encryptedNotes] = await Promise.all([
    tauriInvoke('get_access_token', {
      username: syncState.username,
    }),
    Encryptor.encryptNotes(notesToEncrypt, passwordKey).catch((err) =>
      throwEncryptorError(errorConfig, err)
    ),
  ]);
  if (!encryptedNotes || isCancelled?.()) return;

  if (!accessToken) {
    return clientSideLogout();
  }

  encryptedNotes.forEach((nt) => {
    syncState.encryptedNotesCache.set(nt.uuid, nt);
  });

  const res = await new FetchBuilder('/notes/sync')
    .method('PUT')
    .withAuth(syncState.username, accessToken)
    .body({
      notes: [...syncState.encryptedNotesCache.values()],
      deleted_notes: syncState.unsyncedNotes.deleted,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res || isCancelled?.()) return;

  if (resIsOk(res)) {
    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    // Users' session must still be valid
    syncState.isLoggedIn = true;

    const decryptedNotes = await Promise.all([
      Encryptor.decryptNotes(res.data.note_diff.added, passwordKey),
      Encryptor.decryptNotes(res.data.note_diff.edited, passwordKey),
    ]).catch((err) => throwEncryptorError(errorConfig, err));
    if (!decryptedNotes || isCancelled?.()) return;

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
  noteDiff.added.forEach((rn) => {
    noteState.notes.push(rn);
  });

  sortStateNotes();

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

    document.dispatchEvent(new Event(NOTE_EVENTS.change));
  }
  // Select next note if current selected note is empty and not deliberately created
  else if (noteState.notes.length > 1 && !syncState.unsyncedNotes.new) {
    const foundNote = findNote(noteState.selectedNote.uuid);

    if (!foundNote || isEmptyNote(foundNote)) {
      selectNote(noteState.notes[1]!.uuid);
    }
  }

  syncState.unsyncedNotes.clear();

  return tauriInvoke('sync_local_notes', { notes: noteState.notes });
}

/**
 * Adds sync call to the debounce queue.
 * `isInitial` indicates this is the initial sync on app load.
 */
export function debounceSync(isInitial = false): void {
  if (!isInitial && !syncState.isLoggedIn) return;

  syncQueue.add(
    (isCancelled) => {
      return sync(isCancelled);
    },
    isInitial ? undefined : 500
  );
}

// Keep track of notes with unsynced changes
document.addEventListener(
  NOTE_EVENTS.unsynced,
  (ev: CustomEventInit<UnsyncedEventDetail>) => {
    if (!ev.detail) return;

    syncState.unsyncedNotes.set({ [ev.detail.kind]: [ev.detail.note] });
  }
);

//// Types

export type NoteDiff = {
  added: EncryptedNote[];
  edited: EncryptedNote[];
  deleted: DeletedNote[];
};

export type DecryptedNoteDiff = {
  added: Note[];
  edited: Note[];
  deleted: DeletedNote[];
};

export type DeletedNote = {
  uuid: string;
  deleted_at: number;
};
