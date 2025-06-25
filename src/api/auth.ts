import {
  AppError,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
  Storage,
} from '../classes';
import { noteState } from '../store/note';
import { resetAppError, syncState } from '../store/sync';
import { isEmptyNote, tauriEmit, tauriInvoke } from '../utils';

import { updateLocalNoteStateFromDiff } from './notes';
import {
  parseErrorRes,
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
export const login = route(async () => {
  const errorConfig = {
    code: ERROR_CODE.LOGIN,
    retry: { fn: login },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof login>, 'message'>;

  const passwordKey = await Encryptor.generatePasswordKey(syncState.password);

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes.filter((nt) => !isEmptyNote(nt)),
    passwordKey
  ).catch((err) => throwEncryptorError(errorConfig, err));
  if (!encryptedNotes) return;

  encryptedNotes.forEach((nt) => {
    syncState.encryptedNotesCache.set(nt.id, nt);
  });

  const res = await new FetchBuilder('/auth/login')
    .method('POST')
    .body({
      username: syncState.username,
      password: syncState.password,
      notes: encryptedNotes,
      deleted_notes: syncState.unsyncedNotes.deleted,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res) return;

  if (resIsOk(res)) {
    syncState.password = '';
    syncState.isLoggedIn = true;

    Storage.set('USERNAME', syncState.username);

    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    await KeyStore.storeKey(passwordKey);

    const decryptedNotes = await Promise.all([
      Encryptor.decryptNotes(res.data.note_diff.added, passwordKey),
      Encryptor.decryptNotes(res.data.note_diff.edited, passwordKey),
    ]).catch((err) => throwEncryptorError(errorConfig, err));
    if (!decryptedNotes) return;

    await updateLocalNoteStateFromDiff({
      added: decryptedNotes[0],
      edited: decryptedNotes[1],
      deleted: res.data.note_diff.deleted,
    });
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Signup
export const signup = route(async () => {
  const errorConfig = {
    code: ERROR_CODE.SIGNUP,
    retry: { fn: signup },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof signup>, 'message'>;

  const passwordKey = await Encryptor.generatePasswordKey(syncState.password);

  await KeyStore.storeKey(passwordKey);

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes.filter((nt) => !isEmptyNote(nt)),
    passwordKey
  ).catch((err) => throwEncryptorError(errorConfig, err));
  if (!encryptedNotes) return;

  const res = await new FetchBuilder('/auth/signup')
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
    syncState.unsyncedNotes.clear();

    Storage.set('USERNAME', syncState.username);
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Logout
export const logout = route(async () => {
  const errorConfig = {
    code: ERROR_CODE.LOGOUT,
    retry: { fn: logout },
    display: { form: true },
  } satisfies Omit<ErrorConfig<typeof logout>, 'message'>;

  const accessToken = await tauriInvoke('get_access_token', {
    username: syncState.username,
  });

  const fetchPromise = new FetchBuilder('/auth/logout')
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
