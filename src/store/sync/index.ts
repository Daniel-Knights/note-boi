import { http, invoke } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';
import { reactive } from 'vue';

import { STORAGE_KEYS } from '../../constant';
import { isDev, isEmptyNote, localStorageParse } from '../../utils';
import {
  findNote,
  newNote,
  Note,
  state as noteState,
  selectNote,
  sortStateNotes,
} from '../note';

import { push } from './note';

export enum ErrorType {
  None,
  Auth,
  Push,
  Pull,
  Logout,
}

export type UnsyncedNoteIds = {
  new: string;
  edited: Set<string>;
  deleted: Set<string>;
  size: number;
  clear: () => void;
  add: (ids: { new?: string; edited?: string[]; deleted?: string[] }) => void;
};

const unsyncedNoteIds: Partial<UnsyncedNoteIds> = localStorageParse(
  STORAGE_KEYS.UNSYNCED
);

export const state = reactive({
  username: localStorage.getItem(STORAGE_KEYS.USERNAME) || '',
  password: '',
  token: localStorage.getItem(STORAGE_KEYS.TOKEN) || '',
  isLoading: false,
  isLogin: true, // For switching login/signup form
  error: {
    type: ErrorType.None,
    message: '',
  },
  unsyncedNoteIds: <UnsyncedNoteIds>{
    new: unsyncedNoteIds.new || '',
    edited: new Set<string>(unsyncedNoteIds.edited),
    deleted: new Set<string>(unsyncedNoteIds.deleted),
    get size() {
      return this.edited.size + this.deleted.size;
    },
    clear() {
      this.new = '';
      this.edited.clear();
      this.deleted.clear();
      localStorage.removeItem(STORAGE_KEYS.UNSYNCED);
    },
    add(ids): void {
      if (ids.new !== undefined) this.new = ids.new;

      ids.edited?.forEach((id) => this.edited.add(id));

      // Only track deleted notes if logged in
      ids.deleted?.forEach((id) => {
        this.deleted.add(id);

        if (this.edited.has(id)) {
          this.edited.delete(id);
        }
      });

      if (this.edited.has(this.new) || this.deleted.has(this.new)) {
        this.new = '';
      }

      localStorage.setItem(
        STORAGE_KEYS.UNSYNCED,
        JSON.stringify({
          new: this.new,
          edited: [...this.edited],
          deleted: [...this.deleted],
        })
      );
    },
  },
});

// Utils //

/** Parses an error response and returns a formatted message. */
export function parseErrorRes(res: Response<Record<string, unknown>>): string {
  const unknownErrorMessage = 'Unknown error, please try again';

  if (!res.data) return unknownErrorMessage;

  return typeof res.data.error === 'string' ? res.data.error : unknownErrorMessage;
}

/** Resets {@link state.error}. */
export function resetError(): void {
  state.error = { type: ErrorType.None, message: '' };
}

/** Wrapper for {@link http.fetch}. */
export function tauriFetch<T>(
  endpoint: string,
  method: 'POST' | 'PUT',
  payload?: Record<string, unknown>
): Promise<Response<T>> {
  const baseUrl = isDev()
    ? 'http://localhost:8000'
    : 'https://note-boi-server.herokuapp.com';

  return http.fetch<T>(`${baseUrl}/api${endpoint}`, {
    method,
    body: {
      type: 'Json',
      payload,
    },
  });
}

/** Catches hanging requests (e.g. due to server error). */
export function catchHang(err: unknown, type: ErrorType): void {
  console.error(err);

  state.isLoading = false;
  state.error = {
    type,
    message: 'Request failed',
  };
}

export function clientSideLogout(): void {
  state.token = '';
  state.username = '';

  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
}

/** Syncs local and remote notes. */
export async function syncNotes(remoteNotes: Note[]): Promise<unknown> {
  const hasNoLocalNotes = noteState.notes.length === 1 && isEmptyNote(noteState.notes[0]);

  // Remove any deleted ids if they don't exist on remote
  state.unsyncedNoteIds.deleted.forEach((id) => {
    if (!remoteNotes.some((nt) => nt.id === id)) {
      state.unsyncedNoteIds.deleted.delete(id);
      state.unsyncedNoteIds.add({});
    }
  });

  const unsyncedIds = [state.unsyncedNoteIds.new, ...state.unsyncedNoteIds.edited];
  const unsyncedDeletedIds = [...state.unsyncedNoteIds.deleted];
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

  await push();

  return invoke('sync_all_local_notes', { notes: noteState.notes }).catch(console.error);
}

export { autoPush, push, pull } from './note';
export { login, signup, logout } from './auth';
export { deleteAccount } from './account';
