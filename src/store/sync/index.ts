import { reactive } from 'vue';

import { Endpoint, EndpointPayloads, STORAGE_KEYS } from '../../constant';
import { isDev } from '../../utils';

import { storedUnsyncedNoteIds, UnsyncedNoteIds } from './note';

type ParsedResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
};

export enum ErrorKind {
  None,
  Auth,
  Push,
  Pull,
  Logout,
  Encryptor,
}

export const syncState = reactive({
  username: localStorage.getItem(STORAGE_KEYS.USERNAME) || '',
  password: '',
  newPassword: '',
  isLoading: false,
  isLogin: true, // For switching login/signup form
  isLoggedIn: false,
  error: {
    kind: ErrorKind.None,
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
export function parseErrorRes(res: ParsedResponse<{ error: string }>): string {
  const unknownErrorMessage = 'Unknown error, please try again';

  if (!res.data) return unknownErrorMessage;

  return typeof res.data.error === 'string' ? res.data.error : unknownErrorMessage;
}

/** Resets {@link syncState.error}. */
export function resetError(): void {
  syncState.error = { kind: ErrorKind.None, message: '' };
}

/** Wrapper for {@link fetch}. */
export async function fetchData<
  E extends Endpoint = Endpoint,
  R = EndpointPayloads[E]['response'],
>(
  endpoint: E,
  method: 'POST' | 'PUT',
  payload?: EndpointPayloads[E]['payload']
): Promise<ParsedResponse<R> | ParsedResponse<{ error: string }>> {
  const serverUrl = isDev()
    ? 'http://localhost:8000'
    : 'https://note-boi-server.herokuapp.com';

  const res = await fetch(`${serverUrl}/api${endpoint}`, {
    method,
    body: JSON.stringify(payload ?? {}),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Content-Security-Policy': `default-src: 'self'; connect-src ${serverUrl};`,
    },
  });

  const contentType = res.headers.get('content-type');

  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    data:
      res.body !== null && contentType?.includes('application/json')
        ? await res.json()
        : {},
  };
}

export function resIsOk<T extends EndpointPayloads[Endpoint]['response']>(
  res: ParsedResponse<T> | ParsedResponse<{ error: string }> | void
): res is ParsedResponse<T> {
  return res?.ok === true;
}

/** Catches hanging requests (e.g. due to server error). */
export function catchHang(err: unknown, kind: ErrorKind): void {
  syncState.isLoading = false;
  syncState.error = {
    kind,
    message: 'Request failed',
  };

  console.error(err);
}

/** Catches note encryption errors. */
export function catchEncryptorError(err: unknown): void {
  syncState.isLoading = false;
  syncState.error = {
    kind: ErrorKind.Encryptor,
    message: 'Note encryption/decryption failed',
  };

  console.error(err);
}

export type { UnsyncedNoteIds, StoredUnsyncedNoteIds } from './note';
export { autoPush, push, pull, syncNotes } from './note';
export { clientSideLogout, login, signup, logout } from './auth';
export { changePassword, deleteAccount } from './account';
export { Encryptor } from './encryptor';
export { KeyStore } from './keyStore';
