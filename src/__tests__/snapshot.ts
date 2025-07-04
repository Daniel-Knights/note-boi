import * as n from '../store/note';
import * as s from '../store/sync';
import * as u from '../store/update';
import { KeyStore, Storage, STORAGE_KEYS_STRING, StorageKeyString } from '../classes';
import { openedPopup } from '../store/popup';
import { selectedTheme } from '../store/theme';

import { allCalls, mockDb } from './mock';
import { normaliseEncryptedNote, normaliseNote, normaliseNoteUuid } from './utils';

/** Snapshots app state. Replaces variable values with placeholders. */
export async function snapshotState() {
  // syncState
  s.syncState.unsyncedNotes.edited = new Set(
    [...s.syncState.unsyncedNotes.edited].map(normaliseNoteUuid)
  );
  s.syncState.unsyncedNotes.deleted = s.syncState.unsyncedNotes.deleted.map((dn) => ({
    ...dn,
    uuid: normaliseNoteUuid(dn.uuid),
    deleted_at: 0,
  }));

  if (s.syncState.unsyncedNotes.new) {
    s.syncState.unsyncedNotes.new = normaliseNoteUuid(s.syncState.unsyncedNotes.new);
  }

  s.syncState.encryptedNotesCache = new Map(
    [...s.syncState.encryptedNotesCache.entries()].map(([uuid, nt]) => [
      normaliseNoteUuid(uuid),
      normaliseEncryptedNote(nt),
    ])
  );

  // storage
  const storedUnsyncedNotes = Storage.getJson('UNSYNCED');

  if (storedUnsyncedNotes) {
    storedUnsyncedNotes.edited = [...storedUnsyncedNotes.edited].map(normaliseNoteUuid);
    storedUnsyncedNotes.deleted = storedUnsyncedNotes.deleted.map((dn) => ({
      ...dn,
      uuid: normaliseNoteUuid(dn.uuid),
      deleted_at: 0,
    }));

    if (storedUnsyncedNotes.new) {
      storedUnsyncedNotes.new = normaliseNoteUuid(storedUnsyncedNotes.new);
    }
  }

  // noteState
  n.noteState.notes = n.noteState.notes.map(normaliseNote);
  n.noteState.selectedNote = normaliseNote(n.noteState.selectedNote);

  // mockDb
  const mockDbNormalised: typeof mockDb = {
    ...mockDb,
    deletedNotes: mockDb.deletedNotes?.map((dn) => ({
      ...dn,
      uuid: normaliseNoteUuid(dn.uuid),
      deleted_at: 0,
    })),
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
