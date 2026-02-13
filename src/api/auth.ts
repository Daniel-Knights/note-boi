import {
  AppError,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
  Storage,
  TokenStore,
} from '../classes';
import { noteState } from '../store/note';
import { resetAppError, syncState } from '../store/sync';
import { isEmptyNote, tauriEmit } from '../utils';

import { updateLocalNoteStateFromDiff } from './notes';
import {
  handleStoreKeyError,
  parseErrorRes,
  resIsOk,
  throwAuthorisationError,
  throwEncryptorError,
  throwFetchError,
} from './utils';
import { createRoute } from './utils/route';

const route = createRoute(syncState);

export function clientSideLogout(): Promise<void> {
  if (syncState.username) {
    TokenStore.deleteAccessToken(syncState.username);
  }

  syncState.username = '';
  syncState.isLoggedIn = false;

  Storage.remove('USERNAME');
  KeyStore.reset();

  return tauriEmit('auth', { is_logged_in: false });
}

// Login
export const login = route(async () => {
  const errorConfig: ErrorConfig = {
    code: ERROR_CODE.LOGIN,
    retry: { fn: login },
    display: {
      form: true,
      sync: true,
    },
  };

  const passwordKey = await Encryptor.generatePasswordKey(syncState.password).catch(
    (err) => throwAuthorisationError(errorConfig, err)
  );

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes.filter((nt) => !isEmptyNote(nt)),
    passwordKey
  ).catch((err) => throwEncryptorError(errorConfig, err));

  encryptedNotes.forEach((nt) => {
    syncState.encryptedNotesCache.set(nt.uuid, nt);
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

  if (resIsOk(res)) {
    syncState.password = '';
    syncState.isLoggedIn = true;

    Storage.set('USERNAME', syncState.username);

    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    await KeyStore.storeKey(passwordKey).catch((err) => {
      throw handleStoreKeyError(err, 'Login');
    });

    const decryptedNotes = await Promise.all([
      Encryptor.decryptNotes(res.data.note_diff.added, passwordKey),
      Encryptor.decryptNotes(res.data.note_diff.edited, passwordKey),
    ]).catch((err) => throwEncryptorError(errorConfig, err));

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
  const errorConfig: ErrorConfig = {
    code: ERROR_CODE.SIGNUP,
    retry: { fn: signup },
    display: {
      form: true,
      sync: true,
    },
  };

  const passwordKey = await Encryptor.generatePasswordKey(syncState.password).catch(
    (err) => throwAuthorisationError(errorConfig, err)
  );

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes.filter((nt) => !isEmptyNote(nt)),
    passwordKey
  ).catch((err) => throwEncryptorError(errorConfig, err));

  const res = await new FetchBuilder('/auth/signup')
    .method('POST')
    .body({
      username: syncState.username,
      password: syncState.password,
      notes: encryptedNotes,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));

  if (resIsOk(res)) {
    resetAppError();
    tauriEmit('auth', { is_logged_in: true });

    syncState.password = '';
    syncState.isLoggedIn = true;
    syncState.unsyncedNotes.clear();

    Storage.set('USERNAME', syncState.username);

    await KeyStore.storeKey(passwordKey).catch((err) => {
      throw handleStoreKeyError(err, 'Signup');
    });
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

// Logout
export const logout = route(async () => {
  const errorConfig: ErrorConfig = {
    code: ERROR_CODE.LOGOUT,
    retry: { fn: logout },
    display: { form: true },
  };

  // This shouldn't happen, but just in case
  if (!syncState.username) {
    throwAuthorisationError({
      ...errorConfig,
      retry: undefined,
    });
  }

  const accessToken = await TokenStore.getAccessToken(syncState.username).catch((err) =>
    throwAuthorisationError(errorConfig, err)
  );

  if (!accessToken) {
    throwAuthorisationError(errorConfig);
  }

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
