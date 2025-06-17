import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { initialMockDb, mockDb } from '../mock';

export function resetNoteStore() {
  n.noteState.notes = [];
  n.noteState.selectedNote = new n.Note();
  n.noteState.extraSelectedNotes = [];
}

export function resetSyncStore() {
  s.syncState.username = '';
  s.syncState.password = '';
  s.syncState.newPassword = '';
  s.syncState.loadingCount = 0;
  s.syncState.isLoggedIn = false;
  s.syncState.unsyncedNoteIds.clear(true);
  s.syncState.encryptedNotesCache.clear();

  s.resetAppError();
}

export function resetUpdateStore() {
  u.updateState.isAvailable = false;
  u.updateState.isDownloading = false;
  u.updateState.strategy = 'manual';
}

export function resetMockDb() {
  mockDb.users = structuredClone(initialMockDb.users);
  mockDb.encryptedNotes = structuredClone(initialMockDb.encryptedNotes);
  mockDb.deletedNoteIds = new Set(initialMockDb.deletedNoteIds);
}
