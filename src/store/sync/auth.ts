import { STORAGE_KEYS } from '../../constant';
import { isEmptyNote, tauriEmit } from '../../utils';
import { Note, noteState } from '../note';

import {
  catchHang,
  ErrorType,
  parseErrorRes,
  resetError,
  syncState,
  syncNotes,
  tauriFetch,
} from '.';

export function clientSideLogout(): void {
  syncState.token = '';
  syncState.username = '';

  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
}

// Login
export async function login(): Promise<void> {
  syncState.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/login', 'POST', {
    username: syncState.username,
    password: syncState.password,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (res.ok) {
    syncState.token = res.data.token as string;
    syncState.password = '';

    localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);
    localStorage.setItem(STORAGE_KEYS.TOKEN, syncState.token);

    resetError();
    tauriEmit('login');
    await syncNotes(res.data.notes as Note[]);
  }

  syncState.isLoading = false;

  if (!res.ok) {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Signup
export async function signup(): Promise<void> {
  syncState.isLoading = true;

  const res = await tauriFetch<Record<string, string>>('/signup', 'POST', {
    username: syncState.username,
    password: syncState.password,
    notes: noteState.notes.filter((nt) => !isEmptyNote(nt)),
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  syncState.isLoading = false;

  if (res.ok) {
    resetError();
    tauriEmit('login');

    syncState.token = res.data.token;
    syncState.password = '';
    syncState.unsyncedNoteIds.clear();

    localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);
    localStorage.setItem(STORAGE_KEYS.TOKEN, syncState.token);
  } else {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Logout
export async function logout(): Promise<void> {
  if (!syncState.token) return; // Prevent bug where event.emit triggers event.listen

  syncState.isLoading = true;

  const res = await tauriFetch<Record<string, never | string>>('/logout', 'POST', {
    username: syncState.username,
    token: syncState.token,
  }).catch((err) => catchHang(err, ErrorType.Logout));

  if (!res) return;

  syncState.isLoading = false;

  if (res.ok) {
    resetError();
    tauriEmit('logout');
    clientSideLogout();
  } else {
    syncState.error = {
      type: ErrorType.Logout,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}
