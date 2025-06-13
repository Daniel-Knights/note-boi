import {
  AppError,
  DebounceQueue,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
} from '../classes';
import { DecryptedNoteDiff, NOTE_EVENTS } from '../constant';
import {
  newNote,
  noteState,
  selectNote,
  sortStateNotes,
  UnsyncedEventDetail,
} from '../store/note';
import { resetAppError, syncState } from '../store/sync';
import { isEmptyNote, tauriEmit, tauriInvoke } from '../utils';

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
  const errorConfig = {
    code: ERROR_CODE.SYNC,
    retry: { fn: sync, args: [isCancelled] },
    display: { sync: true },
  } satisfies Omit<ErrorConfig<typeof sync>, 'message'>;

  const passwordKey = await KeyStore.getKey();
  if (!passwordKey || isCancelled?.()) return;

  const notesToEncrypt = noteState.notes.filter((nt) => {
    const noteIsEdited = syncState.unsyncedNoteIds.edited.has(nt.id);
    const noteIsCached = syncState.encryptedNotesCache.has(nt.id);

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
  if (!accessToken || !encryptedNotes || isCancelled?.()) return;

  encryptedNotes.forEach((nt) => {
    syncState.encryptedNotesCache.set(nt.id, nt);
  });

  const res = await new FetchBuilder('/notes/sync')
    .method('PUT')
    .withAuth(syncState.username, accessToken)
    .body({
      notes: [...syncState.encryptedNotesCache.values()],
      deleted_note_ids: [...syncState.unsyncedNoteIds.deleted],
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
      deleted_ids: res.data.note_diff.deleted_ids,
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
  const selectedNoteIsEdited = syncState.unsyncedNoteIds.edited.has(
    noteState.selectedNote.id
  );

  let selectedNoteIsDeleted = false;

  // Resolve edited and deleted note conflicts
  for (let i = noteState.notes.length - 1; i >= 0; i -= 1) {
    const ln = noteState.notes[i]!;
    const isSelectedNote = ln.id === noteState.selectedNote.id;

    // Remove notes that were deleted on the server
    if (
      noteDiff.deleted_ids.includes(ln.id) &&
      (!isSelectedNote || !selectedNoteIsEdited)
    ) {
      noteState.notes.splice(i, 1);

      if (isSelectedNote) {
        selectedNoteIsDeleted = true;
      }

      continue;
    }

    // Update existing notes
    const foundRemoteNoteIndex = noteDiff.edited.findIndex((rn) => rn.id === ln.id);

    if (foundRemoteNoteIndex > -1 && (!isSelectedNote || !selectedNoteIsEdited)) {
      noteState.notes[i] = noteDiff.edited[foundRemoteNoteIndex]!;

      noteDiff.edited.splice(foundRemoteNoteIndex, 1);
    }
  }

  // Add new notes from the server
  noteDiff.added.forEach((rn) => {
    noteState.notes.push(rn);
  });

  // New note if no notes exist
  if (noteState.notes.length === 0) {
    newNote();
  }

  syncState.unsyncedNoteIds.clear(true);
  sortStateNotes();

  // Select next note if the current selected note was deleted
  if (selectedNoteIsDeleted) {
    selectNote(noteState.notes[0]!.id);
  }

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

    syncState.unsyncedNoteIds.set({ [ev.detail.kind]: [ev.detail.noteId] });
  }
);
