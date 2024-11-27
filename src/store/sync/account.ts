import * as dialog from '@tauri-apps/plugin-dialog';

import { AppError, ERROR_CODE, ErrorConfig } from '../../appError';
import { noteState } from '../note';

import { clientSideLogout, Encryptor, syncState } from '.';

import {
  catchEncryptorError,
  catchHang,
  fetchData,
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
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes,
      syncState.newPassword
    ).catch((err) => catchEncryptorError(errorConfig, err));
    if (!encryptedNotes) return;

    const res = await fetchData('/account/password/change', 'PUT', {
      current_password: syncState.password,
      new_password: syncState.newPassword,
      notes: encryptedNotes,
    }).catch((err) => catchHang(errorConfig, err));
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

      if (res.status === 404) {
        await clientSideLogout();
      }

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
    const res = await fetchData('/account/delete', 'POST').catch((err) => {
      catchHang(errorConfig, err);
    });
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

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

      console.error(`ERROR_CODE: ${errorConfig.code}`);
      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}
