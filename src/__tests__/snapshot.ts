import * as n from '../store/note';
import * as s from '../store/sync';
import * as u from '../store/update';
import { KeyStore, Storage, STORAGE_KEYS_STRING, StorageKeyString } from '../classes';
import { openedPopup } from '../store/popup';
import { selectedTheme } from '../store/theme';

import { allCalls, mockDb } from './api';
import { UUID_REGEX } from './utils';

/** Snapshots app state. Replaces variable values with placeholders. */
export async function snapshotState() {
  // syncState
  s.syncState.unsyncedNoteIds.edited = new Set(
    [...s.syncState.unsyncedNoteIds.edited].map(() => 'id')
  );
  s.syncState.unsyncedNoteIds.deleted = new Set(
    [...s.syncState.unsyncedNoteIds.deleted].map(() => 'id')
  );

  if (s.syncState.unsyncedNoteIds.new) {
    s.syncState.unsyncedNoteIds.new = 'id';
  }

  // storage
  const storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

  if (storedUnsyncedNoteIds) {
    storedUnsyncedNoteIds.edited = [...storedUnsyncedNoteIds.edited].map(() => 'id');
    storedUnsyncedNoteIds.deleted = [...storedUnsyncedNoteIds.deleted].map(() => 'id');

    if (storedUnsyncedNoteIds.new) {
      storedUnsyncedNoteIds.new = 'id';
    }
  }

  // noteState
  n.noteState.notes = n.noteState.notes.map((note) => ({
    ...note,
    id: 'id',
    timestamp: 0,
  }));

  n.noteState.selectedNote = {
    ...n.noteState.selectedNote,
    id: 'id',
    timestamp: 0,
  };

  // allCalls
  const allCallsNormalised = allCalls.map((call) => {
    const [, { calledWith }] = call;

    delete call[1].promise;

    if (!isObj(calledWith)) return call;

    if (isObj(calledWith.note)) {
      calledWith.note = {
        ...calledWith.note,
        id: 'id',
        timestamp: 0,
      };
    }

    if (Array.isArray(calledWith.notes)) {
      calledWith.notes = calledWith.notes.map((note) => ({
        ...note,
        id: 'id',
        timestamp: 0,
      }));
    }

    if (typeof calledWith.id === 'string' && UUID_REGEX.test(calledWith.id)) {
      calledWith.id = 'id';
    }

    return call;
  });

  // Snapshots
  const cryptoKey = await KeyStore.getKey();

  expect(s.syncState).toMatchSnapshot('syncState');
  expect(n.noteState).toMatchSnapshot('noteState');
  expect(u.updateState).toMatchSnapshot('updateState');
  expect(openedPopup.value).toMatchSnapshot('openedPopup');
  expect(selectedTheme.value).toMatchSnapshot('selectedTheme');
  expect(cryptoKey).toMatchSnapshot('KeyStore.getKey()');
  expect(document.body.outerHTML).toMatchSnapshot('document.body.outerHTML');
  expect({
    ...mockDb,
    encryptedNotes: mockDb.encryptedNotes.length,
  }).toMatchSnapshot('mockDb');
  expect(allCallsNormalised).toMatchSnapshot('allCalls');

  Object.keys(STORAGE_KEYS_STRING).forEach((key) => {
    expect(Storage.get(key as StorageKeyString)).toMatchSnapshot(`Storage.get('${key}')`);
  });
}

function isObj(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}
