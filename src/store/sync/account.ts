import * as dialog from '@tauri-apps/plugin-dialog';

import {
  AppError,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
} from '../../classes';
import { noteState } from '../note';

import { clientSideLogout, syncState } from '.';

import {
  parseErrorRes,
  resetAppError,
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

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes,
    syncState.newPassword
  ).catch((err) => throwEncryptorError(errorConfig, err));
  if (!encryptedNotes) return;

  const res = await new FetchBuilder('/account/change-password')
    .method('PUT')
    .body({
      current_password: syncState.password,
      new_password: syncState.newPassword,
      notes: encryptedNotes,
    })
    .fetch()
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

  const res = await new FetchBuilder('/account/delete')
    .method('DELETE')
    .fetch()
    .catch((err) => throwFetchError(errorConfig, err));
  if (!res) return;

  if (resIsOk(res)) {
    await clientSideLogout();
    resetAppError();

    syncState.unsyncedNoteIds.clear();
  } else {
    throw new AppError({
      ...errorConfig,
      message: parseErrorRes(res),
    });
  }
});
