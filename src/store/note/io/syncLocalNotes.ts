import { RawNote, Storage } from '../../../classes';
import { isDesktop, tauriInvoke } from '../../../utils';

export function syncLocalNotes(notes: RawNote[]) {
  if (isDesktop()) {
    return tauriInvoke('sync_local_notes', { notes });
  }

  //// Web

  Storage.setJSON('NOTES', notes);
}
