import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';

export function resetNoteStore(): void {
  n.noteState.notes = [];
  n.noteState.selectedNote = new n.Note();
  n.noteState.extraSelectedNotes = [];
}

export function resetSyncStore(): void {
  s.syncState.username = '';
  s.syncState.password = '';
  s.syncState.newPassword = '';
  s.syncState.loadingCount = 0;
  s.syncState.isLoggedIn = false;
  s.syncState.unsyncedNoteIds.clear(true);

  s.resetAppError();
}

export function resetUpdateStore(): void {
  u.updateState.isAvailable = false;
  u.updateState.isDownloading = false;
  u.updateState.strategy = 'manual';
}
