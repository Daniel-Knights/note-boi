import * as dialog from '@tauri-apps/plugin-dialog';

import {
  AppError,
  Encryptor,
  ERROR_CODE,
  ErrorConfig,
  FetchBuilder,
} from '../../classes';
import { tauriInvoke } from '../../utils';
import { noteState } from '../note';

import { clientSideLogout, syncState } from '.';

import {
  catchEncryptorError,
  catchHang,
  parseErrorRes,
  resetAppError,
  resIsOk,
} from './utils';

export async function changePassword(): Promise<void> {
  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.CHANGE_PASSWORD,
    retry: { fn: changePassword },
    display: {
      form: true,
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof changePassword>, 'message'>;

  try {
    const accessToken = await tauriInvoke('get_access_token', {
      username: syncState.username,
    });

    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes,
      syncState.newPassword
    ).catch((err) => catchEncryptorError(errorConfig, err));
    if (!encryptedNotes) return;

    const res = await new FetchBuilder('/account/password/change')
      .method('PUT')
      .withAuth(syncState.username, accessToken)
      .body({
        current_password: syncState.password,
        new_password: syncState.newPassword,
        notes: encryptedNotes,
      })
      .fetch(syncState.username)
      .catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      resetAppError();

      syncState.password = '';
      syncState.newPassword = '';
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

export async function deleteAccount(): Promise<void> {
  const askRes = await dialog.ask('Are you sure?', {
    title: 'Delete account',
    kind: 'warning',
  });
  if (!askRes) return;

  syncState.isLoading = true;

  const errorConfig = {
    code: ERROR_CODE.DELETE_ACCOUNT,
    retry: { fn: deleteAccount },
    display: {
      sync: true,
    },
  } satisfies Omit<ErrorConfig<typeof deleteAccount>, 'message'>;

  try {
    const accessToken = await tauriInvoke('get_access_token', {
      username: syncState.username,
    });

    const res = await new FetchBuilder('/account/delete')
      .method('POST')
      .withAuth(syncState.username, accessToken)
      .fetch()
      .catch((err) => catchHang(errorConfig, err));
    if (!res) return;

    if (resIsOk(res)) {
      await clientSideLogout();
      resetAppError();

      syncState.unsyncedNoteIds.clear();
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
