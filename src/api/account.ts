import {
  AppError,
  Dialog,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
  TokenStore,
} from '../classes';
import { noteState } from '../store/note';
import { resetAppError, syncState } from '../store/sync';

import { clientSideLogout } from './auth';
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

export const changePassword = route(async (): Promise<void> => {
  const errorConfig: ErrorConfig = {
    code: ERROR_CODE.CHANGE_PASSWORD,
    retry: { fn: changePassword },
    display: {
      form: true,
      sync: true,
    },
  };

  // This shouldn't happen, but just in case
  if (!syncState.username) {
    throwAuthorisationError({
      ...errorConfig,
      retry: undefined,
    });
  }

  const [accessToken, newKey] = await Promise.all([
    TokenStore.getAccessToken(syncState.username),
    Encryptor.generatePasswordKey(syncState.newPassword),
  ]).catch((err) => {
    throwAuthorisationError(errorConfig, err);
  });

  if (!accessToken) {
    throwAuthorisationError(errorConfig);
  }

  const encryptedNotes = await Encryptor.encryptNotes(noteState.notes, newKey).catch(
    (err) => throwEncryptorError(errorConfig, err)
  );

  const res = await new FetchBuilder('/account/change-password')
    .method('PUT')
    .withAuth(syncState.username, accessToken)
    .body({
      current_password: syncState.password,
      new_password: syncState.newPassword,
      notes: encryptedNotes,
    })
    .fetch(syncState.username)
    .catch((err) => throwFetchError(errorConfig, err));

  if (resIsOk(res)) {
    resetAppError();

    syncState.password = '';
    syncState.newPassword = '';

    await KeyStore.storeKey(newKey).catch((err) => {
      throw handleStoreKeyError(err, 'Change password');
    });
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

export const deleteAccount = route(async (): Promise<void> => {
  const askRes = await Dialog.ask('Are you sure?', {
    title: 'Delete account',
    kind: 'warning',
  });
  if (!askRes) return;

  const errorConfig: ErrorConfig = {
    code: ERROR_CODE.DELETE_ACCOUNT,
    retry: { fn: deleteAccount },
    display: {
      sync: true,
    },
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

  const res = await new FetchBuilder('/account/delete')
    .method('DELETE')
    .withAuth(syncState.username, accessToken)
    .fetch()
    .catch((err) => throwFetchError(errorConfig, err));

  if (resIsOk(res)) {
    await clientSideLogout();
    resetAppError();
    syncState.unsyncedNotes.clear(true);
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});
