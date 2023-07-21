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

      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      expect(mockNew).toHaveBeenCalledOnce();
    });

    it('with empty note array', async () => {
      mockTauriApi([]);

      await n.getAllNotes();

      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      expect(mockNew).toHaveBeenCalledOnce();
    });

    it('with notes', async () => {
      mockTauriApi(copyObjArr(localNotes));

      await n.getAllNotes();

      assert.strictEqual(n.noteState.notes.length, 10);
      assert.deepEqual(n.noteState.notes[0], localNotes.sort(n.sortNotesFn)[0]);
      assert.deepEqual(n.noteState.notes[0], n.noteState.selectedNote);
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

    assert.deepEqual(
      n.noteState.selectedNote,
      n.noteState.notes[existingNoteIndexSorted]
    );
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockChange).toHaveBeenCalledOnce();
    vi.clearAllMocks();

    // Ensure clearNote works
    n.noteState.notes.push(new n.Note());
    n.selectNote(n.noteState.notes[10].id);
    n.selectNote(n.noteState.notes[9].id);

    assert.isUndefined(n.noteState.notes[10]);
    // 3 = 2 (selectNote) + 1 (clearNote)
    expect(mockSelect).toHaveBeenCalledTimes(3);
    expect(mockChange).toHaveBeenCalledTimes(3);
  });

  it('isSelectedNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    n.selectNote(existingNote.id);

    assert.isTrue(n.isSelectedNote(existingNote));

    n.noteState.notes.push(emptyNote);
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

    assert.notDeepEqual(n.noteState.selectedNote, existingNote);
    assert.isUndefined(n.findNote(existingNote.id));
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockChange).toHaveBeenCalledOnce();
    expect(mockUnsynced).toHaveBeenCalledOnce();

    const otherExistingNote = { ...localNotes[1] };
    assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);
    vi.clearAllMocks();

    n.deleteNote(otherExistingNote.id, false);

    assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);
    assert.isUndefined(n.findNote(otherExistingNote.id));
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockChange).not.toHaveBeenCalled();
    expect(mockUnsynced).toHaveBeenCalledOnce();
  });

  it('deleteAllNotes', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    vi.clearAllMocks();
    const currentSelectedNote = n.noteState.selectedNote;
    const notesSlice = n.noteState.notes.slice(2, 5);
    n.noteState.extraSelectedNotes = notesSlice;

    n.deleteAllNotes();

    assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
    assert.isEmpty(n.noteState.extraSelectedNotes);
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

      assert.notStrictEqual(n.noteState.selectedNote.id, emptyNote.id);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      expect(mockSelect).toHaveBeenCalledOnce();
      expect(mockChange).toHaveBeenCalledOnce();
      expect(mockNew).toHaveBeenCalledOnce();
    });

    it('Only updates the timestamp if called with an already empty note selected', async () => {
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      n.noteState.notes.push(emptyNote);
      n.selectNote(emptyNote.id);
      vi.clearAllMocks();

      n.newNote();

      assert.strictEqual(n.noteState.selectedNote.id, emptyNote.id);
      assert.deepEqual(n.noteState.selectedNote.content, emptyNote.content);
      assert.notStrictEqual(n.noteState.selectedNote.timestamp, emptyNote.timestamp);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockChange).not.toHaveBeenCalled();
      expect(mockNew).not.toHaveBeenCalled();
    });
  });

  it('editNote', async () => {
    mockTauriApi(copyObjArr(localNotes));
    await n.getAllNotes();
    const currentSelectedNote = { ...n.noteState.selectedNote };

    n.editNote({ ops: [{ insert: 'Title\nBody' }] }, 'Title', 'Body');

    assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
    assert.notDeepEqual(n.noteState.selectedNote.content, currentSelectedNote.content);
    assert.notStrictEqual(
      n.noteState.selectedNote.timestamp,
      currentSelectedNote.timestamp
    );
    expect(mockUnsynced).toHaveBeenCalledOnce();
  });

  describe('exportNotes', () => {
    it('All notes', async () => {
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();

      const spyAssertFail = vi.spyOn(assert, 'fail');

      await n.exportNotes();

      expect(spyAssertFail).not.toHaveBeenCalled();
    });

    it('Passed selection of notes', async () => {
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();

      const spyAssertFail = vi.spyOn(assert, 'fail');

      await n.exportNotes([n.noteState.notes[0].id, n.noteState.notes[1].id]);

      expect(spyAssertFail).not.toHaveBeenCalled();
    });
  });
});
