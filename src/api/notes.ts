import {
  AppError,
  DebounceQueue,
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
export const sync = route(async (timeoutId?: number) => {
  const errorConfig = {
    code: ERROR_CODE.SYNC,
    retry: { fn: sync },
    display: { sync: true },
  } satisfies Omit<ErrorConfig<typeof sync>, 'message'>;

  const passwordKey = await KeyStore.getKey();
  if (!passwordKey || syncQueue.isCancelled(timeoutId)) return;

  const [accessToken, encryptedNotes] = await Promise.all([
    tauriInvoke('get_access_token', {
      username: syncState.username,
    }),
    Encryptor.encryptNotes(
      noteState.notes.filter((nt) => !isEmptyNote(nt)),
      passwordKey
    ).catch((err) => throwEncryptorError(errorConfig, err)),
  ]);
  if (!accessToken || !encryptedNotes || syncQueue.isCancelled(timeoutId)) return;

  const res = await new FetchBuilder('/notes/sync')
    .method('PUT')
    .withAuth(syncState.username, accessToken)
    .body({
      notes: encryptedNotes,
      deleted_note_ids: [...syncState.unsyncedNoteIds.deleted],
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res || syncQueue.isCancelled(timeoutId)) return;

  if (resIsOk(res)) {
    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    // Users' session must still be valid
    syncState.isLoggedIn = true;

    const decryptedNotes = await Encryptor.decryptNotes(
      res.data.notes ?? [],
      passwordKey
    ).catch((err) => throwEncryptorError(errorConfig, err));
    if (!decryptedNotes || syncQueue.isCancelled(timeoutId)) return;

    await syncLocalStateWithRemoteNotes(decryptedNotes);
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

export function syncLocalStateWithRemoteNotes(remoteNotes: Note[]) {
  noteState.notes = remoteNotes;

  if (noteState.notes.length === 0) {
    newNote();

    syncState.unsyncedNoteIds.clear(true);
  }
  // Handle selected note
  else if (syncState.unsyncedNoteIds.new) {
    // Keep selected note and add back to notes state
    noteState.notes.unshift({ ...noteState.selectedNote });
    syncState.unsyncedNoteIds.clear();
  } else {
    const newSelectedNote = findNote(noteState.selectedNote.id) || noteState.notes[0];

    // Update selected note and fire event for note editor
    noteState.selectedNote = { ...newSelectedNote! };
    syncState.unsyncedNoteIds.clear(true);

    document.dispatchEvent(new Event(NOTE_EVENTS.change));
  }

  sortStateNotes();

  return tauriInvoke('sync_local_notes', { notes: noteState.notes });
}

// Auto-syncing
export function debounceSync(): void {
  if (!syncState.isLoggedIn) return;

  const timeoutId = syncQueue.add(() => {
    return sync(timeoutId);
  }, 500);
}

// Keep track of notes with unsynced changes
document.addEventListener(
  NOTE_EVENTS.unsynced,
  (ev: CustomEventInit<UnsyncedEventDetail>) => {
    if (!ev.detail) return;

    syncState.unsyncedNoteIds.set({ [ev.detail.kind]: [ev.detail.noteId] });
  }
);
