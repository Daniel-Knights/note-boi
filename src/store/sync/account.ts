import * as dialog from '@tauri-apps/plugin-dialog';

import { noteState } from '../note';

import {
  catchEncryptorError,
  catchHang,
  clientSideLogout,
  Encryptor,
  ErrorKind,
  fetchData,
  parseErrorRes,
  resetError,
  resIsOk,
  syncState,
} from '.';

export async function changePassword(): Promise<void> {
  syncState.isLoading = true;

  try {
    const encryptedNotes = await Encryptor.encryptNotes(
      noteState.notes,
      syncState.newPassword
    ).catch((err) => catchEncryptorError(err));
    if (!encryptedNotes) return;

    const res = await fetchData('/account/password/change', 'PUT', {
      current_password: syncState.password,
      new_password: syncState.newPassword,
      notes: encryptedNotes,
    }).catch((err) => catchHang(err, ErrorKind.Auth));
    if (!res) return;

    if (resIsOk(res)) {
      resetError();

      syncState.password = '';
      syncState.newPassword = '';
    } else {
      syncState.error = {
        kind: ErrorKind.Auth,
        message: parseErrorRes(res),
      };

      if (res.status === 404) {
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
    kind: 'warning',
  });
  if (!askRes) return;

  try {
    syncState.isLoading = true;

    const res = await fetchData('/account/delete', 'POST').catch((err) => {
      catchHang(err, ErrorKind.Auth);
    });
    if (!res) return;

    if (resIsOk(res)) {
      await clientSideLogout();
      resetError();

      syncState.unsyncedNoteIds.clear();
    } else {
      syncState.error = {
        kind: ErrorKind.Auth,
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
