import {
  AppError,
  DebounceQueue,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  Storage,
} from '../../classes';
import { NOTE_EVENTS } from '../../constant';
import { isEmptyNote, tauriEmit, tauriInvoke } from '../../utils';
import {
  findNote,
  newNote,
  Note,
  noteState,
  selectNote,
  sortStateNotes,
  UnsyncedEventDetail,
} from '../note';

import { syncState } from '.';

import {
  parseErrorRes,
  resetAppError,
  resIsOk,
  route,
  throwEncryptorError,
  throwFetchError,
} from './utils';

export const storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

const pushQueue = new DebounceQueue();

/** Syncs local and remote notes. */
export async function syncNotes(remoteNotes: Note[]) {
  const hasNoLocalNotes =
    noteState.notes.length <= 1 &&
    (!noteState.notes[0] || isEmptyNote(noteState.notes[0]));

  // Remove any deleted ids if they don't exist on remote
  syncState.unsyncedNoteIds.deleted.forEach((id) => {
    if (!remoteNotes.some((nt) => nt.id === id)) {
      syncState.unsyncedNoteIds.deleted.delete(id);
      syncState.unsyncedNoteIds.add({});
    }
  });

  // Ensure editor updates with latest selected note content if unedited
  const remoteSelectedNote = remoteNotes.find(
    (nt) => nt.id === noteState.selectedNote.id
  );
  const selectedNoteIsUnsynced = !syncState.unsyncedNoteIds.edited.has(
    noteState.selectedNote.id
  );

  if (remoteSelectedNote && selectedNoteIsUnsynced) {
    noteState.selectedNote.content = remoteSelectedNote.content;
    noteState.selectedNote.timestamp = remoteSelectedNote.timestamp;

    document.dispatchEvent(new Event(NOTE_EVENTS.change));
  }

  const allUnsyncedIds = [
    syncState.unsyncedNoteIds.new,
    ...syncState.unsyncedNoteIds.edited,
    ...syncState.unsyncedNoteIds.deleted,
  ];

  // Find all unsynced local notes
  const unsyncedNotes = allUnsyncedIds.map(findNote).filter(Boolean) as Note[];
  // Discard remote notes that have been changed locally
  const syncedNotes = remoteNotes.filter((nt) => !allUnsyncedIds.includes(nt.id));
  const mergedNotes = [...unsyncedNotes, ...syncedNotes];

  if (mergedNotes.length > 0) {
    noteState.notes = mergedNotes;

    sortStateNotes();
  } else if (hasNoLocalNotes) {
    newNote();
  }

  // Select existing note if current selected note doesn't exist
  if (!noteState.notes.find((nt) => nt.id === noteState.selectedNote.id)) {
    selectNote(noteState.notes[0]!.id);
  }

  // Sync any notes that were edited during pull
  await push();

  return tauriInvoke('sync_local_notes', { notes: noteState.notes });
}

// Pull
export const pull = route(async () => {
  const errorConfig = {
    code: ERROR_CODE.PULL,
    retry: { fn: pull },
    display: { sync: true },
  } satisfies Omit<ErrorConfig<typeof pull>, 'message'>;

  const accessToken = await tauriInvoke('get_access_token', {
    username: syncState.username,
  });
  const res = await new FetchBuilder('/notes/pull')
    .method('GET')
    .withAuth(syncState.username, accessToken)
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res) return;

  if (resIsOk(res)) {
    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    // Users' session must still be valid
    syncState.isLoggedIn = true;

    const decryptedNotes = await Encryptor.decryptNotes(res.data.notes ?? []).catch(
      (err) => throwEncryptorError(errorConfig, err)
    );
    if (!decryptedNotes) return;

    await syncNotes(decryptedNotes);
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Push
export const push = route(async (timeoutId?: number) => {
  if (!syncState.isLoggedIn || syncState.unsyncedNoteIds.size === 0) return;

  const errorConfig = {
    code: ERROR_CODE.PUSH,
    retry: { fn: push },
    display: { sync: true },
  } satisfies Omit<ErrorConfig<typeof push>, 'message'>;

  const [accessToken, encryptedNotes] = await Promise.all([
    tauriInvoke('get_access_token', {
      username: syncState.username,
    }),
    Encryptor.encryptNotes(noteState.notes.filter((nt) => !isEmptyNote(nt))).catch(
      (err) => throwEncryptorError(errorConfig, err)
    ),
  ]);
  if (!encryptedNotes || pushQueue.isCancelled(timeoutId)) return;

  const res = await new FetchBuilder('/notes/push')
    .method('PUT')
    .withAuth(syncState.username, accessToken)
    .body({ notes: encryptedNotes })
    .fetch()
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res || pushQueue.isCancelled(timeoutId)) return;

  if (resIsOk(res)) {
    syncState.unsyncedNoteIds.clear();

    resetAppError();

    syncState.isLoggedIn = true;
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Auto-syncing
export function autoPush(): void {
  if (!syncState.isLoggedIn) return;

  const timeoutId = pushQueue.add(() => {
    return push(timeoutId);
  }, 500);
}

// Keep track of notes with unsynced changes
document.addEventListener(
  NOTE_EVENTS.unsynced,
  (ev: CustomEventInit<UnsyncedEventDetail>) => {
    if (!ev.detail) return;

    syncState.unsyncedNoteIds.add({ [ev.detail.kind]: [ev.detail.noteId] });
  }
);
