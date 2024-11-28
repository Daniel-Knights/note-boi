import { AppError, ERROR_CODE, ErrorConfig } from '../../appError';
import { storage } from '../../storage';
import { isEmptyNote, tauriEmit } from '../../utils';
import { noteState } from '../note';

import { Encryptor, KeyStore, syncNotes, syncState } from '.';

import {
  catchEncryptorError,
  catchHang,
  fetchData,
  parseErrorRes,
  resetAppError,
  resIsOk,
} from './utils';

export function clientSideLogout(): Promise<void> {
  syncState.username = '';
  syncState.isLoggedIn = false;

  storage.remove('USERNAME');

  KeyStore.reset();

  return tauriEmit('auth', { is_logged_in: false });
}

// Login
export async function login(): Promise<void> {
  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.LOGIN,
    retry: { fn: login },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof login>, 'message'>;

  try {
    const res = await fetchData('/login', 'POST', {
      username: syncState.username,
      password: syncState.password,
    }).catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      const { password } = syncState;

      syncState.password = '';
      syncState.isLoggedIn = true;

      storage.set('USERNAME', syncState.username);

      resetAppError();
      tauriEmit('auth', { is_logged_in: true });

      const decryptedNotes = await Encryptor.decryptNotes(
        res.data.notes ?? [],
        password
      ).catch((err) => catchEncryptorError(errorConfig, err));
      if (!decryptedNotes) return;

      await syncNotes(decryptedNotes);
    } else {
      syncState.appError = new AppError({
        ...errorConfig,
        message: parseErrorRes(res),
      });

      console.error(`ERROR_CODE: ${errorConfig.code}`);
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Signup
export async function signup(): Promise<void> {
  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.SIGNUP,
    retry: { fn: signup },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof signup>, 'message'>;

  try {
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes.filter((nt) => !isEmptyNote(nt)),
      syncState.password
    ).catch((err) => catchEncryptorError(errorConfig, err));
    if (!encryptedNotes) return;

    const res = await fetchData('/signup', 'POST', {
      username: syncState.username,
      password: syncState.password,
      notes: encryptedNotes,
    }).catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      resetAppError();
      tauriEmit('auth', { is_logged_in: true });

      syncState.password = '';
      syncState.isLoggedIn = true;
      syncState.unsyncedNoteIds.clear();

      storage.set('USERNAME', syncState.username);
    } else {
      syncState.appError = new AppError({
        ...errorConfig,
        message: parseErrorRes(res),
      });

      console.error(`ERROR_CODE: ${errorConfig.code}`);
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

// Logout
export async function logout(): Promise<void> {
  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.LOGOUT,
    retry: { fn: logout },
    display: {
      form: true,
    },
  } satisfies Omit<ErrorConfig<typeof logout>, 'message'>;

  try {
    const [res] = await Promise.all([
      fetchData('/logout', 'POST').catch((err) => {
        catchHang(errorConfig, err);
      }),
      clientSideLogout(),
    ]);
    if (!res) return;

    if (resIsOk(res)) {
      resetAppError();
    } else {
      console.error(`ERROR_CODE: ${errorConfig.code}`);
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}
