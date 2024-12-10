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
  parseErrorRes,
  resetAppError,
  resIsOk,
  route,
  throwEncryptorError,
  throwFetchError,
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
export const login = route(async (): Promise<void> => {
  const errorConfig = {
    code: ERROR_CODE.LOGIN,
    retry: { fn: login },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof login>, 'message'>;

  const res = await new FetchBuilder('/login')
    .method('POST')
    .body({
      username: syncState.username,
      password: syncState.password,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
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
    ).catch((err) => throwEncryptorError(errorConfig, err));
    if (!decryptedNotes) return;

    await syncNotes(decryptedNotes);
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Signup
export const signup = route(async (): Promise<void> => {
  const errorConfig = {
    code: ERROR_CODE.SIGNUP,
    retry: { fn: signup },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof signup>, 'message'>;

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes.filter((nt) => !isEmptyNote(nt)),
    syncState.password
  ).catch((err) => throwEncryptorError(errorConfig, err));
  if (!encryptedNotes) return;

  const res = await new FetchBuilder('/signup')
    .method('POST')
    .body({
      username: syncState.username,
      password: syncState.password,
      notes: encryptedNotes,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res) return;

  if (resIsOk(res)) {
    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    syncState.password = '';
    syncState.isLoggedIn = true;
    syncState.unsyncedNoteIds.clear();

    Storage.set('USERNAME', syncState.username);
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Logout
export const logout = route(async (): Promise<void> => {
  const errorConfig = {
    code: ERROR_CODE.LOGOUT,
    retry: { fn: logout },
    display: { form: true },
  } satisfies Omit<ErrorConfig<typeof logout>, 'message'>;

  const accessToken = await tauriInvoke('get_access_token', {
    username: syncState.username,
  });

  const fetchPromise = new FetchBuilder('/logout')
    .method('POST')
    .withAuth(syncState.username, accessToken)
    .fetch()
    .catch((err) => throwFetchError(errorConfig, err));

  const [res] = await Promise.all([fetchPromise, clientSideLogout()]);
  if (!res) return;

  if (resIsOk(res)) {
    resetAppError();
  } else {
    // No use bringing this to the user's attention
    throw new AppError({
      code: ERROR_CODE.LOGOUT,
      message: parseErrorRes(res),
    });
  }
});
