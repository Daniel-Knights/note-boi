import * as n from '../../store/note';
import { NOTE_EVENTS } from '../../constant';
import { isEmptyNote } from '../../utils';
import localNotes from '../notes.json';
import { mockTauriApi } from '../tauri';
import { copyObjArr, UUID_REGEX } from '../utils';

const emptyNote = new n.Note();
const existingNoteIndexSorted = 2;
const existingNote = localNotes[8];
const mockChange = vi.fn();
const mockNew = vi.fn();
const mockSelect = vi.fn();
const mockUnsynced = vi.fn();

beforeAll(() => {
  document.addEventListener(NOTE_EVENTS.change, mockChange);
  document.addEventListener(NOTE_EVENTS.new, mockNew);
  document.addEventListener(NOTE_EVENTS.select, mockSelect);
  document.addEventListener(NOTE_EVENTS.unsynced, mockUnsynced);
});

describe('Note store', () => {
  it('new Note()', () => {
    const timestamp = Date.now();

    assert.strictEqual(typeof emptyNote.id, 'string');
    assert.strictEqual(emptyNote.id.length, 36);
    assert.isTrue(UUID_REGEX.test(emptyNote.id));
    // Math.floor to account for tiny discrepancies in Date.now
    assert.strictEqual(
      Math.floor(emptyNote.timestamp / 1000),
      Math.floor(timestamp / 1000)
    );
    assert.deepEqual(emptyNote.content.delta, {});
    assert.strictEqual(emptyNote.content.title, '');
    assert.strictEqual(emptyNote.content.body, '');
  });

  describe('getAllNotes', () => {
    it('with undefined notes', async () => {
      mockTauriApi(undefined);

      await n.getAllNotes();

      assert.strictEqual(n.state.notes.length, 1);
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      expect(mockNew).toHaveBeenCalledOnce();
    });

    it('with empty note array', async () => {
      mockTauriApi([]);

      await n.getAllNotes();

      assert.strictEqual(n.state.notes.length, 1);
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      expect(mockNew).toHaveBeenCalledOnce();
    });

    it('with notes', async () => {
      mockTauriApi(copyObjArr(localNotes));

      await n.getAllNotes();

      assert.strictEqual(n.state.notes.length, 10);
      assert.deepEqual(n.state.notes[0], localNotes.sort(n.sortNotesFn)[0]);
      assert.deepEqual(n.state.notes[0], n.state.selectedNote);
      expect(mockChange).toHaveBeenCalledOnce();
    });
  });

  it('findNoteIndex', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    const index = n.findNoteIndex(existingNote.id);

    assert.strictEqual(index, existingNoteIndexSorted);
    assert.strictEqual(n.findNoteIndex(emptyNote.id), -1);
    assert.strictEqual(n.findNoteIndex(), -1);
  });

  it('findNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();

    const foundNote = n.findNote(existingNote.id);

    assert.isDefined(foundNote);
    assert.strictEqual(foundNote!.id, existingNote.id);
    assert.isUndefined(n.findNote(new n.Note().id));
  });

  it('selectNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    vi.clearAllMocks();

    n.selectNote(existingNote.id);

    assert.deepEqual(n.state.selectedNote, n.state.notes[existingNoteIndexSorted]);
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockChange).toHaveBeenCalledOnce();
    vi.clearAllMocks();

    // Ensure clearNote works
    n.state.notes.push(new n.Note());
    n.selectNote(n.state.notes[10].id);
    n.selectNote(n.state.notes[9].id);

    assert.isUndefined(n.state.notes[10]);
    // 3 = 2 (selectNote) + 1 (clearNote)
    expect(mockSelect).toHaveBeenCalledTimes(3);
    expect(mockChange).toHaveBeenCalledTimes(3);
  });

  it('isSelectedNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    n.selectNote(existingNote.id);

    assert.isTrue(n.isSelectedNote(existingNote));

    n.state.notes.push(emptyNote);
    n.selectNote(emptyNote.id);

    assert.isTrue(n.isSelectedNote(emptyNote));
    assert.isFalse(n.isSelectedNote(existingNote));
  });

  it('deleteNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    vi.clearAllMocks();
    assert.isDefined(n.findNote(existingNote.id));

    n.deleteNote(existingNote.id, true);

    assert.notDeepEqual(n.state.selectedNote, existingNote);
    assert.isUndefined(n.findNote(existingNote.id));
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockChange).toHaveBeenCalledOnce();
    expect(mockUnsynced).toHaveBeenCalledOnce();

    const otherExistingNote = { ...localNotes[1] };
    assert.notDeepEqual(n.state.selectedNote, otherExistingNote);
    vi.clearAllMocks();

    n.deleteNote(otherExistingNote.id, false);

    assert.notDeepEqual(n.state.selectedNote, otherExistingNote);
    assert.isUndefined(n.findNote(otherExistingNote.id));
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockChange).not.toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalledOnce();
  });

  it('deleteAllNotes', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    vi.clearAllMocks();
    const currentSelectedNote = n.state.selectedNote;
    const notesSlice = n.state.notes.slice(2, 5);
    n.state.extraSelectedNotes = notesSlice;

    n.deleteAllNotes();

    assert.notDeepEqual(n.state.selectedNote, currentSelectedNote);
    assert.isEmpty(n.state.extraSelectedNotes);
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockChange).toHaveBeenCalledOnce();
    expect(mockUnsynced).toHaveBeenCalledTimes(notesSlice.length + 1);
  });

  describe('newNote', () => {
    it("When selected note isn't empty", async () => {
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      n.selectNote(existingNote.id);
      vi.clearAllMocks();

      n.newNote();

      assert.notStrictEqual(n.state.selectedNote.id, emptyNote.id);
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      assert.deepEqual(n.state.selectedNote, n.state.notes[0]);
      expect(mockSelect).toHaveBeenCalledOnce();
      expect(mockChange).toHaveBeenCalledOnce();
      expect(mockNew).toHaveBeenCalledOnce();
    });

    it('Only updates the timestamp if called with an already empty note selected', async () => {
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      n.state.notes.push(emptyNote);
      n.selectNote(emptyNote.id);
      vi.clearAllMocks();

      n.newNote();

      assert.strictEqual(n.state.selectedNote.id, emptyNote.id);
      assert.deepEqual(n.state.selectedNote.content, emptyNote.content);
      assert.notStrictEqual(n.state.selectedNote.timestamp, emptyNote.timestamp);
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockChange).not.toHaveBeenCalled();
      expect(mockNew).not.toHaveBeenCalled();
    });
  });

  it('editNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    const currentSelectedNote = { ...n.state.selectedNote };

    n.editNote({ ops: [{ insert: 'Title\nBody' }] }, 'Title', 'Body');

    assert.notDeepEqual(n.state.selectedNote, currentSelectedNote);
    assert.notDeepEqual(n.state.selectedNote.content, currentSelectedNote.content);
    assert.notStrictEqual(n.state.selectedNote.timestamp, currentSelectedNote.timestamp);
    expect(mockUnsynced).toHaveBeenCalledOnce();
  });
});
