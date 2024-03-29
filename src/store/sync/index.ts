import { http } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';
import { reactive } from 'vue';

import { Endpoint, EndpointPayloads, STORAGE_KEYS } from '../../constant';
import { isDev } from '../../utils';

import { storedUnsyncedNoteIds, UnsyncedNoteIds } from './note';

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
  newPassword: '',
  token: localStorage.getItem(STORAGE_KEYS.TOKEN) || '',
  isLoading: false,
  isLogin: true, // For switching login/signup form
  error: {
    type: ErrorType.None,
    message: '',
  },
  unsyncedNoteIds: <UnsyncedNoteIds>{
    new: storedUnsyncedNoteIds?.new || '',
    edited: new Set<string>(storedUnsyncedNoteIds?.edited),
    deleted: new Set<string>(storedUnsyncedNoteIds?.deleted),
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
export function parseErrorRes(res: Response<{ error: string }>): string {
  const unknownErrorMessage = 'Unknown error, please try again';

  if (!res.data) return unknownErrorMessage;

  return typeof res.data.error === 'string' ? res.data.error : unknownErrorMessage;
}

/** Resets {@link syncState.error}. */
export function resetError(): void {
  syncState.error = { type: ErrorType.None, message: '' };
}

/** Wrapper for {@link http.fetch}. */
export function tauriFetch<
  E extends Endpoint = Endpoint,
  R = EndpointPayloads[E]['response'],
>(
  endpoint: E,
  method: 'POST' | 'PUT',
  payload: EndpointPayloads[E]['payload']
): Promise<Response<R> | Response<{ error: string }>> {
  const baseUrl = isDev()
    ? 'http://localhost:8000'
    : 'https://note-boi-server.herokuapp.com';

  return http.fetch<R>(`${baseUrl}/api${endpoint}`, {
    method,
    body: {
      type: 'Json',
      payload,
    },
  });
}

export function resIsOk<T extends EndpointPayloads[Endpoint]['response']>(
  resp: Response<T> | Response<{ error: string }> | void
): resp is Response<T> {
  return resp?.ok === true;
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

export type { UnsyncedNoteIds, StoredUnsyncedNoteIds } from './note';
export { autoPush, push, pull, syncNotes } from './note';
export { clientSideLogout, login, signup, logout } from './auth';
export { changePassword, deleteAccount } from './account';
export { Encryptor } from './encryptor';
export { KeyStore } from './keyStore';
