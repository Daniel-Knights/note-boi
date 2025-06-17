import * as n from '../store/note';
import * as s from '../store/sync';
import * as u from '../store/update';
import { KeyStore, Storage, STORAGE_KEYS_STRING, StorageKeyString } from '../classes';
import { openedPopup } from '../store/popup';
import { selectedTheme } from '../store/theme';

import { allCalls, mockDb } from './mock';
import { normaliseEncryptedNote, normaliseNote, normaliseNoteId } from './utils';

/** Snapshots app state. Replaces variable values with placeholders. */
export async function snapshotState() {
  // syncState
  s.syncState.unsyncedNoteIds.edited = new Set(
    [...s.syncState.unsyncedNoteIds.edited].map(normaliseNoteId)
  );
  s.syncState.unsyncedNoteIds.deleted = new Set(
    [...s.syncState.unsyncedNoteIds.deleted].map(normaliseNoteId)
  );

  if (s.syncState.unsyncedNoteIds.new) {
    s.syncState.unsyncedNoteIds.new = normaliseNoteId(s.syncState.unsyncedNoteIds.new);
  }

  s.syncState.encryptedNotesCache = new Map(
    [...s.syncState.encryptedNotesCache.entries()].map(([id, nt]) => [
      normaliseNoteId(id),
      normaliseEncryptedNote(nt),
    ])
  );

  // storage
  const storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

  if (storedUnsyncedNoteIds) {
    storedUnsyncedNoteIds.edited = [...storedUnsyncedNoteIds.edited].map(normaliseNoteId);
    storedUnsyncedNoteIds.deleted = [...storedUnsyncedNoteIds.deleted].map(
      normaliseNoteId
    );

    if (storedUnsyncedNoteIds.new) {
      storedUnsyncedNoteIds.new = normaliseNoteId(storedUnsyncedNoteIds.new);
    }
  }

  // noteState
  n.noteState.notes = n.noteState.notes.map(normaliseNote);
  n.noteState.selectedNote = normaliseNote(n.noteState.selectedNote);

  // mockDb
  const mockDbNormalised: typeof mockDb = {
    ...mockDb,
    deletedNoteIds: new Set([...(mockDb.deletedNoteIds ?? [])].map(normaliseNoteId)),
    encryptedNotes: mockDb.encryptedNotes.map(normaliseEncryptedNote),
  };

  // Snapshots
  const cryptoKey = await KeyStore.getKey();

  expect(s.syncState).toMatchSnapshot('syncState');
  expect(n.noteState).toMatchSnapshot('noteState');
  expect(u.updateState).toMatchSnapshot('updateState');
  expect(openedPopup.value).toMatchSnapshot('openedPopup');
  expect(selectedTheme.value).toMatchSnapshot('selectedTheme');
  expect(cryptoKey).toMatchSnapshot('KeyStore.getKey()');
  expect(document.body.outerHTML).toMatchSnapshot('document.body.outerHTML');
  expect(mockDbNormalised).toMatchSnapshot('mockDb');
  expect(allCalls).toMatchSnapshot('allCalls');

  Object.keys(STORAGE_KEYS_STRING).forEach((key) => {
    expect(Storage.get(key as StorageKeyString)).toMatchSnapshot(`Storage.get('${key}')`);
  });
}
