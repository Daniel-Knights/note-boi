import { reactive } from 'vue';

import { AppError, Storage, UnsyncedNotesManager } from '../classes';

export const syncState = reactive({
  username: Storage.get('USERNAME') || '',
  password: '',
  newPassword: '',
  loadingCount: 0,
  isLoggedIn: false,
  appError: new AppError(),
  unsyncedNoteIds: new UnsyncedNotesManager(),
});

/** Resets {@link syncState.appError}. */
export function resetAppError(): void {
  syncState.appError = new AppError();
}
