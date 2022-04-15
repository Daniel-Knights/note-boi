import { assert, beforeAll, describe, expect, it, vi } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';

import * as noteStore from '../../store/note';
import localNotes from '../notes.json';
import { isEmptyNote } from '../../utils';
import { setCrypto } from '../utils';

const emptyNote = new noteStore.Note();
const existingNoteIndexSorted = 2;
const existingNote = localNotes[8];

function mockInvokes(notes: noteStore.Note[] | undefined) {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'get_all_notes':
        return new Promise<noteStore.Note[] | undefined>((res) => {
          res(notes);
        });
      case 'delete_note':
        return new Promise<void>((res) => {
          res();
        });
      case 'new_note':
        return new Promise<void>((res) => {
          res();
        });
      case 'edit_note':
        return new Promise<void>((res) => {
          noteStore.state.selectedNote = args.note as noteStore.Note;
          res();
        });
      // no default
    }
  });
}

beforeAll(setCrypto);

describe('Note store', () => {
  it('Constructs a new note', () => {
    const timestamp = Date.now();

    assert.strictEqual(typeof emptyNote.id, 'string');
    assert.strictEqual(emptyNote.id.length, 36);
    assert.isTrue(
      // UUID regex
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
        emptyNote.id
      )
    );
    // Math.floor to account for tiny discrepancies in Date.now
    assert.strictEqual(
      Math.floor(emptyNote.timestamp / 1000),
      Math.floor(timestamp / 1000)
    );
    assert.strictEqual(emptyNote.content.delta, '');
    assert.strictEqual(emptyNote.content.title, '');
    assert.strictEqual(emptyNote.content.body, '');
  });

  // Runs here to ensure subsequent tests have a populated store
  it('Gets all local notes', async () => {
    const mockChange = vi.fn(() => undefined);
    document.addEventListener('note-change', mockChange);

    mockInvokes(undefined);
    await noteStore.getAllNotes();
    assert.strictEqual(noteStore.state.notes.length, 1);
    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
    expect(mockChange).toHaveBeenCalled();

    mockInvokes([]);
    await noteStore.getAllNotes();
    assert.strictEqual(noteStore.state.notes.length, 1);
    assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));

    mockInvokes(localNotes);
    await noteStore.getAllNotes();
    assert.strictEqual(noteStore.state.notes.length, 10);
    assert.deepEqual(noteStore.state.notes[0], localNotes[0]);
    assert.deepEqual(noteStore.state.notes[0], noteStore.state.selectedNote);
  });

  it('Finds note index within state.notes by id', () => {
    const index = noteStore.findNoteIndex(existingNote.id);

    assert.strictEqual(index, existingNoteIndexSorted);
    assert.strictEqual(noteStore.findNoteIndex(emptyNote.id), -1);
    assert.strictEqual(noteStore.findNoteIndex(), -1);
  });

  it('Finds note within state.notes by id', () => {
    const foundNote = noteStore.findNote(existingNote.id);

    assert.isDefined(foundNote);
    assert.strictEqual(foundNote!.id, existingNote.id);
    assert.isUndefined(noteStore.findNote(new noteStore.Note().id));
  });

  it('Selects a note with given id', () => {
    const mockSelect = vi.fn(() => undefined);
    const mockChange = vi.fn(() => undefined);

    document.addEventListener('note-select', mockSelect);
    document.addEventListener('note-change', mockChange);

    noteStore.state.notes.push(emptyNote);
    noteStore.selectNote(emptyNote.id);

    assert.deepEqual(noteStore.state.selectedNote, emptyNote);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockChange).toHaveBeenCalled();

    noteStore.selectNote(existingNote.id);

    assert.deepEqual(
      noteStore.state.selectedNote,
      noteStore.state.notes[existingNoteIndexSorted]
    );

    // Ensure clearNote works
    assert.isFalse(isEmptyNote(noteStore.state.notes[9]));
  });

  it('Checks if note with given id is currently selected', () => {
    assert.isTrue(noteStore.isSelectedNote(existingNote));

    noteStore.state.notes.push(emptyNote);
    noteStore.selectNote(emptyNote.id);

    assert.isTrue(noteStore.isSelectedNote(emptyNote));
    assert.isFalse(noteStore.isSelectedNote(existingNote));
  });

  it('Deletes note with given id', () => {
    const mockChange = vi.fn(() => undefined);
    const mockUnsynced = vi.fn(() => undefined);

    document.addEventListener('note-change', mockChange);
    document.addEventListener('note-unsynced', mockUnsynced);

    assert.isDefined(noteStore.findNote(existingNote.id));

    noteStore.deleteNote(existingNote.id, true);

    assert.notDeepEqual(noteStore.state.selectedNote, existingNote);
    assert.isUndefined(noteStore.findNote(existingNote.id));
    expect(mockChange).toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalled();
  });

  it('Deletes selected note and any extra selected notes', () => {
    const mockChange = vi.fn(() => undefined);
    const mockUnsynced = vi.fn(() => undefined);
    const currentSelectedNote = noteStore.state.selectedNote;

    document.addEventListener('note-change', mockChange);
    document.addEventListener('note-unsynced', mockUnsynced);

    noteStore.state.extraSelectedNotes = noteStore.state.notes.slice(2, 5);
    noteStore.deleteAllNotes();

    assert.notDeepEqual(noteStore.state.selectedNote, currentSelectedNote);
    assert.isEmpty(noteStore.state.extraSelectedNotes);
    expect(mockChange).toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalled();
  });

  it('Creates a new note', () => {
    const mockChange = vi.fn(() => undefined);
    const mockNew = vi.fn(() => undefined);
    const mockUnsynced = vi.fn(() => undefined);

    document.addEventListener('note-change', mockChange);
    document.addEventListener('note-new', mockNew);
    document.addEventListener('note-unsynced', mockUnsynced);

    noteStore.selectNote(emptyNote.id);
    noteStore.newNote();

    assert.strictEqual(noteStore.state.selectedNote.id, emptyNote.id);
    assert.deepEqual(noteStore.state.selectedNote.content, emptyNote.content);
    assert.notStrictEqual(noteStore.state.selectedNote.timestamp, emptyNote.timestamp);
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));

    noteStore.selectNote(existingNote.id);
    noteStore.newNote();

    assert.notStrictEqual(noteStore.state.selectedNote.id, emptyNote.id);
    assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
    assert.deepEqual(noteStore.state.selectedNote, noteStore.state.notes[0]);
    expect(mockChange).toHaveBeenCalled();
    expect(mockNew).toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalled();
  });

  it('Edits currently selected note', () => {
    const mockUnsynced = vi.fn(() => undefined);
    const currentSelectedNote = noteStore.state.selectedNote;

    document.addEventListener('note-unsynced', mockUnsynced);

    vi.useFakeTimers();
    setTimeout(() => {
      noteStore.editNote('{"ops":[{"insert":"Title\nBody"}]}-', 'Title', 'Body');

      assert.notDeepEqual(noteStore.state.selectedNote, currentSelectedNote);
      assert.notDeepEqual(
        noteStore.state.selectedNote.content,
        currentSelectedNote.content
      );
      assert.notStrictEqual(
        noteStore.state.selectedNote.timestamp,
        currentSelectedNote.timestamp
      );
      expect(mockUnsynced).toHaveBeenCalled();
    });
  });
});
