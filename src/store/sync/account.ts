import { dialog } from '@tauri-apps/api';

import { noteState } from '../note';

import {
  catchHang,
  clientSideLogout,
  Encryptor,
  ErrorType,
  KeyStore,
  parseErrorRes,
  resetError,
  resIsOk,
  syncState,
  tauriFetch,
} from '.';

export async function changePassword(): Promise<void> {
  syncState.isLoading = true;

  try {
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes,
      syncState.newPassword
    ).catch((err) => {
      syncState.error = {
        type: ErrorType.Auth,
        message: 'Unable to encrypt notes with new password',
      };

      console.error(err);
    });

    if (!encryptedNotes) return;

    const res = await tauriFetch('/account/password/change', 'PUT', {
      current_password: syncState.password,
      new_password: syncState.newPassword,
      notes: encryptedNotes,
    }).catch((err) => catchHang(err, ErrorType.Auth));

    if (!res) return;

    if (resIsOk(res)) {
      resetError();

      syncState.password = '';
      syncState.newPassword = '';
    } else {
      syncState.error = {
        type: ErrorType.Auth,
        message: parseErrorRes(res),
      };

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}

export async function deleteAccount(): Promise<void> {
  const askRes = await dialog.ask('Are you sure?', {
    title: 'Delete account',
    type: 'warning',
  });
  if (!askRes) return;

  try {
    syncState.isLoading = true;

    const res = await tauriFetch('/account/delete', 'POST').catch((err) => {
      catchHang(err, ErrorType.Auth);
    });

    if (!res) return;

    if (resIsOk(res)) {
      await clientSideLogout();
      resetError();

      syncState.unsyncedNoteIds.clear();

      await KeyStore.reset();
    } else {
      syncState.error = {
        type: ErrorType.Auth,
        message: parseErrorRes(res),
      };

      if (res.status === 401 || res.status === 404) {
        await clientSideLogout();
      }

      console.error(res.data);
    }
  } finally {
    syncState.isLoading = false;
  }
}
