import * as dialog from '@tauri-apps/plugin-dialog';

import {
  AppError,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
  KeyStore,
} from '../classes';
import { noteState } from '../store/note';
import { resetAppError, syncState } from '../store/sync';
import { tauriInvoke } from '../utils';

import { clientSideLogout } from './auth';
import {
  parseErrorRes,
  resIsOk,
  route,
  throwEncryptorError,
  throwFetchError,
} from './utils';

export const changePassword = route(async (): Promise<void> => {
  const errorConfig = {
    code: ERROR_CODE.CHANGE_PASSWORD,
    retry: { fn: changePassword },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof changePassword>, 'message'>;

  const newKey = await Encryptor.generatePasswordKey(syncState.newPassword);

  await KeyStore.storeKey(newKey);

  const [accessToken, encryptedNotes] = await Promise.all([
    tauriInvoke('get_access_token', {
      username: syncState.username,
    }),
    Encryptor.encryptNotes(noteState.notes, newKey).catch((err) =>
      throwEncryptorError(errorConfig, err)
    ),
  ]);
  if (!accessToken || !encryptedNotes) return;

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
  if (!res) return;

  if (resIsOk(res)) {
    resetAppError();

    syncState.password = '';
    syncState.newPassword = '';
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});

export const deleteAccount = route(async (): Promise<void> => {
  const askRes = await dialog.ask('Are you sure?', {
    title: 'Delete account',
    kind: 'warning',
  });
  if (!askRes) return;

  const errorConfig = {
    code: ERROR_CODE.DELETE_ACCOUNT,
    retry: { fn: deleteAccount },
    display: {
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof deleteAccount>, 'message'>;

  const accessToken = await tauriInvoke('get_access_token', {
    username: syncState.username,
  });

  const res = await new FetchBuilder('/account/delete')
    .method('DELETE')
    .withAuth(syncState.username, accessToken)
    .fetch()
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res) return;

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
