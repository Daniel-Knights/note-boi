import { STORAGE_KEYS } from '../../constant';
import { tauriEmit } from '../../utils';
import { Note } from '../note';

import {
  catchHang,
  ErrorType,
  parseErrorRes,
  resetError,
  syncState,
  tauriFetch,
} from '.';

export async function changePassword(): Promise<void> {
  syncState.isLoading = true;

  const res = await tauriFetch<Record<string, string>>(
    '/account/password/change',
    'PUT',
    {
      username: syncState.username,
      token: syncState.token,
      current_password: syncState.password,
      new_password: syncState.newPassword,
    }
  ).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  syncState.isLoading = false;

  if (res.ok) {
    resetError();

    syncState.password = '';
    syncState.newPassword = '';
    syncState.token = res.data.token;

    localStorage.setItem(STORAGE_KEYS.TOKEN, syncState.token);
  } else {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

export async function deleteAccount(): Promise<void> {
  syncState.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>(
    '/account/delete',
    'POST',
    {
      username: syncState.username,
      token: syncState.token,
    }
  ).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (res.ok) {
    syncState.username = '';
    syncState.token = '';

    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    resetError();
    tauriEmit('logout');
    syncState.unsyncedNoteIds.clear();
  }

  syncState.isLoading = false;

  if (!res.ok) {
    syncState.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}
