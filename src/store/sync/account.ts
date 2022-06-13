import { STORAGE_KEYS } from '../../constant';
import { tauriEmit } from '../../utils';
import { Note } from '../note';

import { catchHang, ErrorType, parseErrorRes, resetError, state, tauriFetch } from '.';

export async function deleteAccount(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>(
    '/account/delete',
    'POST',
    {
      username: state.username,
      token: state.token,
    }
  ).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (res.ok) {
    state.username = '';
    state.token = '';

    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    resetError();
    tauriEmit('logout');
    state.unsyncedNoteIds.clear();
  }

  state.isLoading = false;

  if (!res.ok) {
    state.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}
