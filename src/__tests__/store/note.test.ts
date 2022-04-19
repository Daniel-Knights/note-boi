import { resetNoteStore, setCrypto } from '../utils';
import { isEmptyNote } from '../../utils';
import { mockTauriApi } from '../tauri';
import * as noteStore from '../../store/note';
import localNotes from '../notes.json';

const emptyNote = new noteStore.Note();
const existingNoteIndexSorted = 2;
const existingNote = localNotes[8];
const mockChange = vi.fn(() => undefined);
const mockNew = vi.fn(() => undefined);
const mockSelect = vi.fn(() => undefined);
const mockUnsynced = vi.fn(() => undefined);

beforeAll(() => {
  setCrypto();
  document.addEventListener(noteStore.noteEvents.change, mockChange);
  document.addEventListener(noteStore.noteEvents.new, mockNew);
  document.addEventListener(noteStore.noteEvents.select, mockSelect);
  document.addEventListener(noteStore.noteEvents.unsynced, mockUnsynced);
});

beforeEach(() => {
  resetNoteStore();
  vi.clearAllMocks(); // Ensure mock checks are clear
});

describe('Note store', () => {
  it('new Note()', () => {
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
  describe('getAllNotes', () => {
    it('with undefined notes', async () => {
      mockTauriApi(undefined);

      await noteStore.getAllNotes();

      assert.strictEqual(noteStore.state.notes.length, 1);
      assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
      assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
      expect(mockNew).toHaveBeenCalled();
    });

    it('with empty note array', async () => {
      mockTauriApi([]);

      await noteStore.getAllNotes();

      assert.strictEqual(noteStore.state.notes.length, 1);
      assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
      assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
      expect(mockNew).toHaveBeenCalled();
    });

    it('with notes', async () => {
      mockTauriApi(localNotes);

      await noteStore.getAllNotes();

      assert.strictEqual(noteStore.state.notes.length, 10);
      assert.deepEqual(noteStore.state.notes[0], localNotes[0]);
      assert.deepEqual(noteStore.state.notes[0], noteStore.state.selectedNote);
      expect(mockChange).toHaveBeenCalled();
    });
  });

  it('findNoteIndex', async () => {
    mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    const index = noteStore.findNoteIndex(existingNote.id);

    assert.strictEqual(index, existingNoteIndexSorted);
    assert.strictEqual(noteStore.findNoteIndex(emptyNote.id), -1);
    assert.strictEqual(noteStore.findNoteIndex(), -1);
  });

  it('findNote', async () => {
    mockTauriApi(localNotes);
    await noteStore.getAllNotes();

    const foundNote = noteStore.findNote(existingNote.id);

    assert.isDefined(foundNote);
    assert.strictEqual(foundNote!.id, existingNote.id);
    assert.isUndefined(noteStore.findNote(new noteStore.Note().id));
  });

  it('selectNote', async () => {
    mockTauriApi(localNotes);
    await noteStore.getAllNotes();
    noteStore.state.notes.push(new noteStore.Note());
    vi.clearAllMocks(); // Ensure mock checks are clear

    noteStore.selectNote(existingNote.id);

    assert.deepEqual(
      noteStore.state.selectedNote,
      noteStore.state.notes[existingNoteIndexSorted]
    );
    expect(mockSelect).toHaveBeenCalled();
    expect(mockChange).toHaveBeenCalled();
    vi.clearAllMocks(); // Ensure mock checks are clear

    // Ensure clearNote works
    noteStore.selectNote(noteStore.state.notes[10].id);
    noteStore.selectNote(noteStore.state.notes[9].id);

    assert.isUndefined(noteStore.state.notes[10]);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockChange).toHaveBeenCalled();
  });

  it('isSelectedNote', async () => {
    mockTauriApi(localNotes);
    await noteStore.getAllNotes();
    noteStore.selectNote(existingNote.id);

    assert.isTrue(noteStore.isSelectedNote(existingNote));

    noteStore.state.notes.push(emptyNote);
    noteStore.selectNote(emptyNote.id);

    assert.isTrue(noteStore.isSelectedNote(emptyNote));
    assert.isFalse(noteStore.isSelectedNote(existingNote));
  });

  it('deleteNote', async () => {
    mockTauriApi(localNotes);
    await noteStore.getAllNotes();
    vi.clearAllMocks(); // Ensure mock checks are clear
    assert.isDefined(noteStore.findNote(existingNote.id));

    noteStore.deleteNote(existingNote.id, true);

    assert.notDeepEqual(noteStore.state.selectedNote, existingNote);
    assert.isUndefined(noteStore.findNote(existingNote.id));
    expect(mockChange).toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalled();
  });

  it('deleteAllNotes', () => {
    const currentSelectedNote = noteStore.state.selectedNote;
    noteStore.state.extraSelectedNotes = noteStore.state.notes.slice(2, 5);

    noteStore.deleteAllNotes();

    assert.notDeepEqual(noteStore.state.selectedNote, currentSelectedNote);
    assert.isEmpty(noteStore.state.extraSelectedNotes);
    expect(mockChange).toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalled();
  });

  describe('newNote', () => {
    it("When selected note isn't empty", async () => {
      mockTauriApi(localNotes);
      await noteStore.getAllNotes();
      noteStore.selectNote(existingNote.id);
      vi.clearAllMocks(); // Ensure mock checks are clear

      noteStore.newNote();

      assert.notStrictEqual(noteStore.state.selectedNote.id, emptyNote.id);
      assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
      assert.deepEqual(noteStore.state.selectedNote, noteStore.state.notes[0]);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockChange).toHaveBeenCalled();
      expect(mockNew).toHaveBeenCalled();
    });

    it('Only updates the timestamp if called with an already empty note selected', async () => {
      mockTauriApi(localNotes);
      await noteStore.getAllNotes();
      noteStore.state.notes.push(emptyNote);
      noteStore.selectNote(emptyNote.id);
      vi.clearAllMocks(); // Ensure mock checks are clear

      noteStore.newNote();

      assert.strictEqual(noteStore.state.selectedNote.id, emptyNote.id);
      assert.deepEqual(noteStore.state.selectedNote.content, emptyNote.content);
      assert.notStrictEqual(noteStore.state.selectedNote.timestamp, emptyNote.timestamp);
      assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockChange).not.toHaveBeenCalled();
      expect(mockNew).not.toHaveBeenCalled();
    });
  });

  it('editNote', async () => {
    mockTauriApi(localNotes);
    await noteStore.getAllNotes();
    const currentSelectedNote = { ...noteStore.state.selectedNote };

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
