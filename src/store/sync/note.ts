import { NOTE_EVENTS, STORAGE_KEYS } from '../../constant';
import { isEmptyNote, localStorageParse, tauriEmit, tauriInvoke } from '../../utils';
import {
  findNote,
  newNote,
  Note,
  noteState,
  selectNote,
  sortStateNotes,
  UnsyncedEventDetail,
} from '../note';

import {
  catchHang,
  clientSideLogout,
  Encryptor,
  ErrorType,
  parseErrorRes,
  resetError,
  resIsOk,
  syncState,
  tauriFetch,
} from '.';

export type UnsyncedNoteIds = {
  new: string;
  edited: Set<string>;
  deleted: Set<string>;
  size: number;
  clear: () => void;
  add: (ids: { new?: string; edited?: string[]; deleted?: string[] }) => void;
};

export type StoredUnsyncedNoteIds = {
  new: string;
  // The original Set objects are stringified as arrays for storage
  edited: string[];
  deleted: string[];
};

export const storedUnsyncedNoteIds: StoredUnsyncedNoteIds | null = localStorageParse(
  STORAGE_KEYS.UNSYNCED
);

/** Syncs local and remote notes. */
export async function syncNotes(remoteNotes: Note[]): Promise<unknown> {
  const hasNoLocalNotes = noteState.notes.length <= 1 && isEmptyNote(noteState.notes[0]);

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

  try {
    const res = await tauriFetch('/notes/pull', 'POST').catch((err) => {
      catchHang(err, ErrorType.Pull);
    });

    if (!res) return;

    if (resIsOk(res)) {
      resetError();
      tauriEmit('login');

      // Users' session must still be valid
      syncState.isLoggedIn = true;

      const decryptedNotes = await Encryptor.decryptNotes(res.data.notes);

      await syncNotes(decryptedNotes);
    } else {
      syncState.error = {
        type: ErrorType.Pull,
        message: parseErrorRes(res),
      };

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Push
export async function push(isSyncCleanup?: boolean): Promise<void> {
  if (!syncState.isLoggedIn || (syncState.isLoading && !isSyncCleanup)) return;
  if (syncState.unsyncedNoteIds.size === 0) return;

  syncState.isLoading = true;

  try {
    // Cache ids and clear before request to prevent
    // race condition if a note is edited mid-push
    const cachedUnsyncedNoteIds = {
      new: syncState.unsyncedNoteIds.new,
      edited: [...syncState.unsyncedNoteIds.edited],
      deleted: [...syncState.unsyncedNoteIds.deleted],
    };

    syncState.unsyncedNoteIds.clear();

    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes.filter((nt) => !isEmptyNote(nt))
    );

    const res = await tauriFetch('/notes/push', 'PUT', {
      notes: encryptedNotes,
    }).catch((err) => catchHang(err, ErrorType.Push));

    if (!res) return;

    if (resIsOk(res)) {
      resetError();

      syncState.isLoggedIn = true;
    } else {
      // Add back unsynced note ids
      syncState.unsyncedNoteIds.add(cachedUnsyncedNoteIds);

      syncState.error = {
        type: ErrorType.Push,
        message: parseErrorRes(res),
      };

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

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

    syncState.unsyncedNoteIds.add({ [ev.detail.type]: [ev.detail.noteId] });
  }
);
