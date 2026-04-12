import { reactive } from 'vue';

import {
  AppError,
  EncryptedDeletedNote,
  EncryptedNote,
  PersistentStorage,
  UnsyncedNotesManager,
} from '../classes';

export const syncState = reactive({
  username: PersistentStorage.get('USERNAME') || '',
  password: '',
  newPassword: '',
  loadingCount: 0,
  isLoggedIn: false,
  appError: new AppError(),
  unsyncedNotes: new UnsyncedNotesManager(),
  encryptedNotesCache: new Map<string, string>(),
});

//// Helpers

/** Resets {@link syncState.appError}. */
export function resetAppError(): void {
  syncState.appError = new AppError();
}

/**
 * Updates encrypted notes cache from the given diff.
 */
export function applyDiffToEncryptedNotesCache(diff: {
  added: EncryptedNote[];
  edited: EncryptedNote[];
  deleted: EncryptedDeletedNote[];
}): void {
  [...diff.added, ...diff.edited].forEach((nt) => {
    syncState.encryptedNotesCache.set(nt.uuid, nt.content);
  });

  diff.deleted.forEach((nt) => {
    if (!nt.deleted_permanently) return;

    syncState.encryptedNotesCache.delete(nt.uuid);
  });
}
