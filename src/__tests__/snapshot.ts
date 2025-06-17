import * as n from '../store/note';
import * as s from '../store/sync';
import * as u from '../store/update';
import {
  EncryptedNote,
  KeyStore,
  Storage,
  STORAGE_KEYS_STRING,
  StorageKeyString,
} from '../classes';
import { openedPopup } from '../store/popup';
import { selectedTheme } from '../store/theme';

import { UUID_REGEX } from './constant';
import { allCalls, mockDb } from './mock';
import { getDummyNotes, isNote, isObj } from './utils';

const staticNoteIds = new Set(getDummyNotes().map((nt) => nt.id));

/** Snapshots app state. Replaces variable values with placeholders. */
export async function snapshotState() {
  /** Returns id unchanged if static, otherwise returns `'id'` */
  const normaliseNoteId = (id: string) => (staticNoteIds.has(id) ? id : 'id');

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
  n.noteState.notes = n.noteState.notes.map((nt) => ({
    ...nt,
    id: normaliseNoteId(nt.id),
    timestamp: 0,
  }));

  n.noteState.selectedNote = {
    ...n.noteState.selectedNote,
    id: normaliseNoteId(n.noteState.selectedNote.id),
    timestamp: 0,
  };

  // allCalls
  const allCallsNormalised = allCalls.map((call) => {
    const [, { calledWith }] = call;

    delete call[1].promise;

    if (!isObj(calledWith)) return call;

    if (isNote(calledWith.note)) {
      calledWith.note = {
        ...calledWith.note,
        id: normaliseNoteId(calledWith.note.id),
        timestamp: 0,
      };
    }

    if (Array.isArray(calledWith.notes)) {
      calledWith.notes = calledWith.notes.map((nt) => ({
        ...nt,
        id: normaliseNoteId(nt.id),
        timestamp: 0,
      }));
    }

    if ('body' in calledWith && typeof calledWith.body === 'string') {
      const parsedBody = JSON.parse(calledWith.body);

      if ('notes' in parsedBody) {
        parsedBody.notes = (parsedBody.notes as EncryptedNote[]).map((nt) => ({
          ...nt,
          id: normaliseNoteId(nt.id),
          timestamp: 0,
          content: 'content',
        }));
      }

      if ('deleted_note_ids' in parsedBody) {
        parsedBody.deleted_note_ids = (parsedBody.deleted_note_ids as string[]).map(
          normaliseNoteId
        );
      }

      calledWith.body = JSON.stringify(parsedBody);
    }

    if (typeof calledWith.id === 'string' && UUID_REGEX.test(calledWith.id)) {
      calledWith.id = normaliseNoteId(calledWith.id);
    }

    return call;
  });

  // mockDb
  const mockDbNormalised: typeof mockDb = {
    ...mockDb,
    deletedNoteIds: new Set([...(mockDb.deletedNoteIds ?? [])].map(normaliseNoteId)),
    encryptedNotes: mockDb.encryptedNotes.map((nt) => ({
      ...nt,
      id: normaliseNoteId(nt.id),
      content: 'content',
    })),
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
  expect(allCallsNormalised).toMatchSnapshot('allCalls');

  Object.keys(STORAGE_KEYS_STRING).forEach((key) => {
    expect(Storage.get(key as StorageKeyString)).toMatchSnapshot(`Storage.get('${key}')`);
  });
}
