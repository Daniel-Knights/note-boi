import {
  AppError,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
  Storage,
} from '../../classes';
import { isEmptyNote, tauriEmit, tauriInvoke } from '../../utils';
import { noteState } from '../note';

import { syncNotes, syncState } from '.';

import {
  catchEncryptorError,
  catchHang,
  parseErrorRes,
  resetAppError,
  resIsOk,
} from './utils';

export function clientSideLogout(): Promise<void> {
  tauriInvoke('delete_access_token', { username: syncState.username });

  syncState.username = '';
  syncState.isLoggedIn = false;

  Storage.remove('USERNAME');
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
    const res = await new FetchBuilder('/login')
      .method('POST')
      .body({
        username: syncState.username,
        password: syncState.password,
      })
      .fetch()
      .catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      const { password } = syncState;

      syncState.password = '';
      syncState.isLoggedIn = true;

      Storage.set('USERNAME', syncState.username);

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

    const res = await new FetchBuilder('/signup')
      .method('POST')
      .body({
        username: syncState.username,
        password: syncState.password,
        notes: encryptedNotes,
      })
      .fetch()
      .catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      resetAppError();
      tauriEmit('auth', { is_logged_in: true });

      syncState.password = '';
      syncState.isLoggedIn = true;
      syncState.unsyncedNoteIds.clear();

      Storage.set('USERNAME', syncState.username);
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
    const fetchPromise = new FetchBuilder('/logout')
      .method('POST')
      .withAuth(syncState.username)
      .fetch()
      .catch((err) => catchHang(errorConfig, err));

    const [res] = await Promise.all([fetchPromise, clientSideLogout()]);
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
