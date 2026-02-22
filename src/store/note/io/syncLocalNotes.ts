import { PersistentStorage, RawNote } from '../../../classes';
import { isDesktop, tauriInvoke } from '../../../utils';

export function syncLocalNotes(notes: RawNote[]) {
  if (isDesktop()) {
    return tauriInvoke('sync_local_notes', { notes });
  }

  //// Web

  PersistentStorage.setJSON('NOTES', notes);
}
