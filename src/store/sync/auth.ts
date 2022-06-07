import { STORAGE_KEYS } from '../../constant';
import { isEmptyNote, tauriEmit } from '../../utils';
import { Note, state as noteState } from '../note';

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

// Login
export async function login(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/login', 'POST', {
    username: state.username,
    password: state.password,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (res.ok) {
    state.token = res.data.token as string;
    state.password = '';

    localStorage.setItem(STORAGE_KEYS.USERNAME, state.username);
    localStorage.setItem(STORAGE_KEYS.TOKEN, state.token);

    resetError();
    tauriEmit('login');
    await syncNotes(res.data.notes as Note[]);
  }

  state.isLoading = false;

  if (!res.ok) {
    state.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Signup
export async function signup(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string>>('/signup', 'POST', {
    username: state.username,
    password: state.password,
    notes: noteState.notes.filter((nt) => !isEmptyNote(nt)),
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  state.isLoading = false;

  if (res.ok) {
    resetError();
    tauriEmit('login');

    state.token = res.data.token;
    state.password = '';
    state.unsyncedNoteIds.clear();

    localStorage.setItem(STORAGE_KEYS.USERNAME, state.username);
    localStorage.setItem(STORAGE_KEYS.TOKEN, state.token);
  } else {
    state.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Logout
export async function logout(): Promise<void> {
  if (!state.token) return; // Prevent bug where event.emit triggers event.listen

  state.isLoading = true;

  const res = await tauriFetch<Record<string, never | string>>('/logout', 'POST', {
    username: state.username,
    token: state.token,
  }).catch((err) => catchHang(err, ErrorType.Logout));

  if (!res) return;

  state.isLoading = false;

  if (res.ok) {
    resetError();
    tauriEmit('logout');
    clientSideLogout();
  } else {
    state.error = {
      type: ErrorType.Logout,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}
