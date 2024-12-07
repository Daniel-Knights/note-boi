import {
  AppError,
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

import { clientSideLogout, syncState } from '.';

import {
  catchEncryptorError,
  catchHang,
  parseErrorRes,
  resetAppError,
  resIsOk,
} from './utils';

export type UnsyncedNoteIds = {
  new: string;
  edited: Set<string>;
  deleted: Set<string>;
  size: number;
  clear: () => void;
  add: (ids: { new?: string; edited?: string[]; deleted?: string[] }) => void;
};

export const storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

/** Syncs local and remote notes. */
export async function syncNotes(remoteNotes: Note[]): Promise<unknown> {
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
  await push(true);

  return tauriInvoke('sync_local_notes', { notes: noteState.notes }).catch(console.error);
}

// Pull
export async function pull(): Promise<void> {
  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.PULL,
    retry: { fn: pull },
    display: {
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof pull>, 'message'>;

  try {
    const res = await new FetchBuilder('/notes/pull')
      .method('POST')
      .withAuth(syncState.username)
      .fetch()
      .catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      resetAppError();
      tauriEmit('auth', { is_logged_in: true });

      // Users' session must still be valid
      syncState.isLoggedIn = true;

      const decryptedNotes = await Encryptor.decryptNotes(res.data.notes ?? []).catch(
        (err) => {
          return catchEncryptorError(errorConfig, err);
        }
      );
      if (!decryptedNotes) return;

      await syncNotes(decryptedNotes);
    } else {
      syncState.appError = new AppError({
        ...errorConfig,
        message: parseErrorRes(res),
      });

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

      console.error(`ERROR_CODE: ${errorConfig.code}`);
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Push
export async function push(isSyncCleanup?: boolean): Promise<void> {
  if (!syncState.isLoggedIn) return;
  if (syncState.isLoading && !isSyncCleanup) return;
  if (syncState.unsyncedNoteIds.size === 0) return;

  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.PUSH,
    retry: {
      fn: push,
      args: isSyncCleanup ? [isSyncCleanup] : [],
    },
    display: {
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof push>, 'message'>;

  try {
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes.filter((nt) => !isEmptyNote(nt))
    ).catch((err) => catchEncryptorError(errorConfig, err));
    if (!encryptedNotes) return;

    // Cache ids and clear before request to prevent
    // race condition if a note is edited mid-push
    const cachedUnsyncedNoteIds = {
      new: syncState.unsyncedNoteIds.new,
      edited: [...syncState.unsyncedNoteIds.edited],
      deleted: [...syncState.unsyncedNoteIds.deleted],
    };

    syncState.unsyncedNoteIds.clear();

    const res = await new FetchBuilder('/notes/push')
      .method('PUT')
      .withAuth(syncState.username)
      .body({ notes: encryptedNotes })
      .fetch()
      .catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      resetAppError();

      syncState.isLoggedIn = true;
    } else {
      // Add back unsynced note ids
      syncState.unsyncedNoteIds.add(cachedUnsyncedNoteIds);

      syncState.appError = new AppError({
        ...errorConfig,
        message: parseErrorRes(res),
      });

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

      console.error(`ERROR_CODE: ${errorConfig.code}`);
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Auto-syncing
let timeout: number | undefined;

export function autoPush(): void {
  if (!syncState.isLoggedIn) return;

  clearTimeout(timeout);
  timeout = window.setTimeout(push, 500);
}

// Keep track of notes with unsynced changes
document.addEventListener(
  NOTE_EVENTS.unsynced,
  (ev: CustomEventInit<UnsyncedEventDetail>) => {
    if (!ev.detail) return;

    syncState.unsyncedNoteIds.add({ [ev.detail.kind]: [ev.detail.noteId] });
  }
);
