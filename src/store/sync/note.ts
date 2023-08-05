import { NOTE_EVENTS, STORAGE_KEYS } from '../../constant';
import { isEmptyNote, localStorageParse, tauriInvoke } from '../../utils';
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
  ErrorType,
  parseErrorRes,
  resetError,
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

export const unsyncedNoteIds: Partial<UnsyncedNoteIds> = localStorageParse(
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

  const unsyncedIds = [
    syncState.unsyncedNoteIds.new,
    ...syncState.unsyncedNoteIds.edited,
  ];
  const unsyncedDeletedIds = [...syncState.unsyncedNoteIds.deleted];
  const unsyncedNotes = unsyncedIds.map(findNote).filter(Boolean) as Note[];
  const syncedNotes = remoteNotes.filter((nt) => {
    return ![...unsyncedIds, ...unsyncedDeletedIds].includes(nt.id);
  });

  const mergedNotes = [...unsyncedNotes, ...syncedNotes];

  if (mergedNotes.length > 0) {
    noteState.notes = mergedNotes;
    sortStateNotes();
  } else {
    newNote();
  }

  if (hasNoLocalNotes) {
    selectNote(noteState.notes[0].id);
  }

  // Sync any notes that were edited during pull
  await push(true);

  return tauriInvoke('sync_local_notes', { notes: noteState.notes }).catch(console.error);
}

// Pull
export async function pull(): Promise<void> {
  if (!syncState.token) return;

  syncState.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/notes', 'POST', {
    username: syncState.username,
    token: syncState.token,
  }).catch((err) => catchHang(err, ErrorType.Pull));

  if (!res) return;

  if (res.ok) {
    resetError();
    await syncNotes(res.data.notes as Note[]);
  }

  syncState.isLoading = false;

  if (!res.ok) {
    syncState.error = {
      type: ErrorType.Pull,
      message: parseErrorRes(res),
    };

    // User not found
    if (res.status === 404) clientSideLogout();

    console.error(res.data);
  }
}

// Push
export async function push(isSyncCleanup?: boolean): Promise<void> {
  if (!syncState.token || (syncState.isLoading && !isSyncCleanup)) return;

  syncState.isLoading = true;

  // Cache ids and clear before request to prevent
  // race condition if a note is edited mid-push
  const cachedUnsyncedNoteIds = {
    new: syncState.unsyncedNoteIds.new,
    edited: [...syncState.unsyncedNoteIds.edited],
    deleted: [...syncState.unsyncedNoteIds.deleted],
  };
  syncState.unsyncedNoteIds.clear();

  const res = await tauriFetch<Record<string, never | string>>('/notes', 'PUT', {
    username: syncState.username,
    token: syncState.token,
    notes: noteState.notes.filter((nt) => !isEmptyNote(nt)),
  }).catch((err) => catchHang(err, ErrorType.Push));

  if (!res) return;

  syncState.isLoading = false;

  if (res.ok) {
    resetError();
  } else {
    // Add back unsynced note ids
    syncState.unsyncedNoteIds.add(cachedUnsyncedNoteIds);
    syncState.error = {
      type: ErrorType.Push,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Auto-syncing
let timeout: number | undefined;

export function autoPush(): void {
  if (!syncState.token) return;

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
