import { http } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';
import { reactive } from 'vue';

import { STORAGE_KEYS } from '../../constant';
import { isDev } from '../../utils';
import { UnsyncedNoteIds, unsyncedNoteIds } from './note';

export enum ErrorType {
  None,
  Auth,
  Push,
  Pull,
  Logout,
}

export const syncState = reactive({
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
  syncState.error = { type: ErrorType.None, message: '' };
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

  syncState.isLoading = false;
  syncState.error = {
    type,
    message: 'Request failed',
  };
}

export { autoPush, push, pull, syncNotes, UnsyncedNoteIds } from './note';
export { clientSideLogout, login, signup, logout } from './auth';
export { deleteAccount } from './account';
