import { STORAGE_KEYS } from '../../constant';
import { isEmptyNote, tauriEmit } from '../../utils';
import { noteState } from '../note';

import {
  catchHang,
  Encryptor,
  ErrorType,
  KeyStore,
  parseErrorRes,
  resetError,
  resIsOk,
  syncNotes,
  syncState,
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

  const res = await tauriFetch('/login', 'POST', {
    username: syncState.username,
    password: syncState.password,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (resIsOk(res)) {
    const decryptedNotes = await Encryptor.decryptNotes(
      res.data.notes,
      syncState.password
    );

    syncState.token = res.data.token;
    syncState.password = '';

    localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);
    localStorage.setItem(STORAGE_KEYS.TOKEN, syncState.token);

    resetError();
    tauriEmit('login');

    await syncNotes(decryptedNotes);
  } else {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }

  syncState.isLoading = false;
}

// Signup
export async function signup(): Promise<void> {
  syncState.isLoading = true;

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes.filter((nt) => !isEmptyNote(nt)),
    syncState.password
  );

  const res = await tauriFetch('/signup', 'POST', {
    username: syncState.username,
    password: syncState.password,
    notes: encryptedNotes,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (resIsOk(res)) {
    resetError();
    tauriEmit('login');

    syncState.token = res.data.token;
    syncState.password = '';
    syncState.unsyncedNoteIds.clear();

    localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);
    localStorage.setItem(STORAGE_KEYS.TOKEN, syncState.token);
  } else if (!encryptedNotes) {
    syncState.error = {
      type: ErrorType.Auth,
      message: 'Error signing up',
    };

    console.error('Unable to encrypt notes');
  } else {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }

  syncState.isLoading = false;
}

// Logout
export async function logout(): Promise<void> {
  syncState.isLoading = true;

  const res = await tauriFetch('/logout', 'POST', {
    username: syncState.username,
    token: syncState.token,
  }).catch((err) => catchHang(err, ErrorType.Logout));

  if (!res) return;

  if (resIsOk(res)) {
    resetError();
    tauriEmit('logout');
    clientSideLogout();

    await KeyStore.reset();
  } else {
    syncState.error = {
      type: ErrorType.Logout,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }

  syncState.isLoading = false;
}
