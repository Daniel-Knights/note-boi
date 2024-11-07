import { STORAGE_KEYS } from '../../constant';
import { isEmptyNote, tauriEmit } from '../../utils';
import { noteState } from '../note';

import {
  catchEncryptorError,
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

export function clientSideLogout(): Promise<void> {
  syncState.username = '';
  syncState.isLoggedIn = false;

  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  // TBR: https://github.com/tauri-apps/wry/issues/518
  //      https://github.com/tauri-apps/wry/issues/444
  localStorage.removeItem(STORAGE_KEYS.COOKIE);

  return tauriEmit('logout');
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
    ).catch((err) => catchEncryptorError(err));
    if (!decryptedNotes) return;

    syncState.password = '';
    syncState.isLoggedIn = true;

    localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);

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

  try {
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes.filter((nt) => !isEmptyNote(nt)),
      syncState.password
    ).catch((err) => catchEncryptorError(err));
    if (!encryptedNotes) return;

    const res = await tauriFetch('/signup', 'POST', {
      username: syncState.username,
      password: syncState.password,
      notes: encryptedNotes,
    }).catch((err) => catchHang(err, ErrorType.Auth));

    if (!res) return;

    if (resIsOk(res)) {
      resetError();
      tauriEmit('login');

      syncState.password = '';
      syncState.isLoggedIn = true;
      syncState.unsyncedNoteIds.clear();

      localStorage.setItem(STORAGE_KEYS.USERNAME, syncState.username);
    } else {
      syncState.error = {
        type: ErrorType.Auth,
        message: parseErrorRes(res),
      };
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
      tauriFetch('/logout', 'POST').catch((err) => {
        catchHang(err, ErrorType.Logout);
      }),
      clientSideLogout(),
      KeyStore.reset(),
    ]);

    if (resIsOk(res)) {
      resetError();
    } else if (res) {
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}
