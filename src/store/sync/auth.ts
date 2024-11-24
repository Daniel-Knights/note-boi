import { STORAGE_KEYS } from '../../constant';
import { isEmptyNote, tauriEmit } from '../../utils';
import { noteState } from '../note';

import {
  catchEncryptorError,
  catchHang,
  Encryptor,
  ErrorKind,
  fetchData,
  KeyStore,
  parseErrorRes,
  resetError,
  resIsOk,
  syncNotes,
  syncState,
} from '.';

export function clientSideLogout(): Promise<void> {
  syncState.username = '';
  syncState.isLoggedIn = false;

  localStorage.removeItem(STORAGE_KEYS.USERNAME);

  KeyStore.reset();

  return tauriEmit('auth', { is_logged_in: false });
}

// Login
export async function login(): Promise<void> {
  syncState.isLoading = true;

  try {
    const res = await fetchData('/login', 'POST', {
      username: syncState.username,
      password: syncState.password,
    }).catch((err) => catchHang(err, ErrorKind.Auth));
    if (!res) return;

    if (resIsOk(res)) {
      const { password } = syncState;

      syncState.password = '';
      syncState.isLoggedIn = true;

      localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);

      resetError();
      tauriEmit('auth', { is_logged_in: true });

      const decryptedNotes = await Encryptor.decryptNotes(
        res.data.notes ?? [],
        password
      ).catch((err) => catchEncryptorError(err));
      if (!decryptedNotes) return;

      await syncNotes(decryptedNotes);
    } else {
      syncState.error = {
        kind: ErrorKind.Auth,
        message: parseErrorRes(res),
      };

      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Signup
export async function signup(): Promise<void> {
  syncState.isLoading = true;

  try {
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes.filter((nt) => !isEmptyNote(nt)),
      syncState.password
    ).catch((err) => catchEncryptorError(err));
    if (!encryptedNotes) return;

    const res = await fetchData('/signup', 'POST', {
      username: syncState.username,
      password: syncState.password,
      notes: encryptedNotes,
    }).catch((err) => catchHang(err, ErrorKind.Auth));
    if (!res) return;

    if (resIsOk(res)) {
      resetError();
      tauriEmit('auth', { is_logged_in: true });

      syncState.password = '';
      syncState.isLoggedIn = true;
      syncState.unsyncedNoteIds.clear();

      localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);
    } else {
      syncState.error = {
        kind: ErrorKind.Auth,
        message: parseErrorRes(res),
      };

      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Logout
export async function logout(): Promise<void> {
  syncState.isLoading = true;

  try {
    const [res] = await Promise.all([
      fetchData('/logout', 'POST').catch((err) => {
        catchHang(err, ErrorKind.Logout);
      }),
      clientSideLogout(),
    ]);
    if (!res) return;

    if (resIsOk(res)) {
      resetError();
    } else if (res) {
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}
