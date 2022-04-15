import { randomFillSync } from 'crypto';
import { assert, beforeAll, describe, it } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';

import * as noteStore from '../../store/note';
import localNotes from '../notes.json';
import { isEmptyNote } from '../../utils';

const existingNoteIndexSorted = 2;
const existingNoteId = localNotes[8].id;

function mockGetAllNotes(notes: noteStore.Note[] | undefined) {
  mockIPC((cmd) => {
    if (cmd === 'get_all_notes') {
      return new Promise<noteStore.Note[] | undefined>((res) => {
        res(notes);
      });
    }
  });
}

// jsdom doesn't come with a WebCrypto implementation
beforeAll(() => {
  window.crypto = {
    // @ts-expect-error strict typing unnecessary here
    getRandomValues: (array) => randomFillSync(array),
  };
});

describe('Note store', () => {
  it('Constructs a new note', () => {
    const timestamp = Date.now();
    const note = new noteStore.Note();

    assert.strictEqual(typeof note.id, 'string');
    assert.strictEqual(note.id.length, 36);
    assert.isTrue(
      // UUID regex
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
        note.id
      )
    );
    // Math.floor to account for tiny discrepancies in Date.now
    assert.strictEqual(Math.floor(note.timestamp / 10), Math.floor(timestamp / 10));
    assert.strictEqual(note.content.delta, '');
    assert.strictEqual(note.content.title, '');
    assert.strictEqual(note.content.body, '');
  });

  // Runs here to ensure subsequent tests have a populated store
  it('Gets all local notes', async () => {
    mockGetAllNotes(undefined);
    await noteStore.getAllNotes();
    assert.strictEqual(noteStore.state.notes.length, 1);
    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));

    mockGetAllNotes([]);
    await noteStore.getAllNotes();
    assert.strictEqual(noteStore.state.notes.length, 1);
    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));

    mockGetAllNotes(localNotes);
    await noteStore.getAllNotes();
    assert.strictEqual(noteStore.state.notes.length, 10);
    assert.deepEqual(noteStore.state.notes[0], localNotes[0]);
    assert.deepEqual(noteStore.state.notes[0], noteStore.state.selectedNote);
  });

  it('Finds note index within state.notes by id', () => {
    const note = new noteStore.Note();
    const index = noteStore.findNoteIndex(existingNoteId);

    assert.strictEqual(index, existingNoteIndexSorted);
    assert.strictEqual(noteStore.findNoteIndex(note.id), -1);
    assert.strictEqual(noteStore.findNoteIndex(), -1);
  });

  it('Finds note within state.notes by id', () => {
    const foundNote = noteStore.findNote(existingNoteId);

    assert.isDefined(foundNote);
    assert.strictEqual(foundNote!.id, existingNoteId);
    assert.isUndefined(noteStore.findNote(new noteStore.Note().id));
  });

  it('Deletes state.selectedNote when note is empty', () => {});

  it('Selects a note with given id', () => {});

  it('Checks if note with given id is currently selected', () => {});

  it('Deletes note with given id', () => {});

  it('Deletes selected note and any extra selected notes', () => {});

  it('Creates a new note', () => {});

  it('Edits currently selected note', () => {});
});
