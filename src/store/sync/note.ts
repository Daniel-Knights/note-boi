import { NOTE_EVENTS } from '../../constant';
import { isEmptyNote } from '../../utils';
import { Note, state as noteState, UnsyncedEventDetail } from '../note';

import {
  catchHang,
  clientSideLogout,
  ErrorType,
  parseErrorRes,
  resetError,
  state,
  syncNotes,
  tauriFetch,
} from '.';

// Pull
export async function pull(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/notes', 'POST', {
    username: state.username,
    token: state.token,
  }).catch((err) => catchHang(err, ErrorType.Pull));

  if (!res) return;

  if (res.ok) {
    resetError();
    await syncNotes(res.data.notes as Note[]);
  }

  state.isLoading = false;

  if (!res.ok) {
    state.error = {
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
  if (!state.token || (state.isLoading && !isSyncCleanup)) return;

  state.isLoading = true;

  // Cache ids and clear before request to prevent
  // race condition if a note is edited mid-push
  const cachedUnsyncedNoteIds = {
    new: state.unsyncedNoteIds.new,
    edited: [...state.unsyncedNoteIds.edited],
    deleted: [...state.unsyncedNoteIds.deleted],
  };
  state.unsyncedNoteIds.clear();

  const res = await tauriFetch<Record<string, never | string>>('/notes', 'PUT', {
    username: state.username,
    token: state.token,
    notes: noteState.notes.filter((nt) => !isEmptyNote(nt)),
  }).catch((err) => catchHang(err, ErrorType.Push));

  if (!res) return;

  state.isLoading = false;

  if (res.ok) {
    resetError();
  } else {
    // Add back unsynced note ids
    state.unsyncedNoteIds.add(cachedUnsyncedNoteIds);
    state.error = {
      type: ErrorType.Push,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Auto-syncing
let timeout: number | undefined;

export function autoPush(): void {
  if (!state.token) return;

  clearTimeout(timeout);
  timeout = window.setTimeout(push, 500);
}

// Keep track of notes with unsynced changes
document.addEventListener(
  NOTE_EVENTS.unsynced,
  (ev: CustomEventInit<UnsyncedEventDetail>) => {
    if (!ev.detail) return;

    state.unsyncedNoteIds.add({ [ev.detail.type]: [ev.detail.noteId] });
  }
);
