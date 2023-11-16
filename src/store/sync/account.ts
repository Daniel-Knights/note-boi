import { dialog } from '@tauri-apps/api';

import { STORAGE_KEYS } from '../../constant';
import { tauriEmit } from '../../utils';
import { noteState } from '../note';

import {
  catchHang,
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

  const encryptedNotes = await Encryptor.encryptNotes(
    noteState.notes,
    syncState.newPassword
  );

  const res = await tauriFetch('/account/password/change', 'PUT', {
    username: syncState.username,
    token: syncState.token,
    current_password: syncState.password,
    new_password: syncState.newPassword,
    notes: encryptedNotes,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (resIsOk(res)) {
    resetError();

    syncState.password = '';
    syncState.newPassword = '';
    syncState.token = res.data.token;

    localStorage.setItem(STORAGE_KEYS.TOKEN, syncState.token);
  } else if (!encryptedNotes) {
    syncState.error = {
      type: ErrorType.Auth,
      message: 'Error changing password',
    };

    console.error('Unable to encrypt notes');
  } else {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }

  syncState.isLoading = false;
}

export async function deleteAccount(): Promise<void> {
  const askRes = await dialog.ask('Are you sure?', {
    title: 'Delete account',
    type: 'warning',
  });
  if (!askRes) return;

  syncState.isLoading = true;

  const res = await tauriFetch('/account/delete', 'POST', {
    username: syncState.username,
    token: syncState.token,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (resIsOk(res)) {
    syncState.username = '';
    syncState.token = '';

    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    resetError();
    tauriEmit('logout');
    syncState.unsyncedNoteIds.clear();

    KeyStore.reset();
  } else {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }

  syncState.isLoading = false;
}
