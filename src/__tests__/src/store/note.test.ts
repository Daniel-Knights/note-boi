import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { NOTE_EVENTS } from '../../../constant';
import { isEmptyNote } from '../../../utils';
import { clearMockApiResults, mockApi } from '../../api';
import localNotes from '../../notes.json';
import { UUID_REGEX } from '../../utils';

const existingNoteIndexSorted = 2;
const existingNote = localNotes[8];

const mockChangeEventCb = vi.fn();
const mockNewEventCb = vi.fn();
const mockSelectEventCb = vi.fn();
const mockUnsyncedEventCb = vi.fn();

beforeAll(() => {
  document.addEventListener(NOTE_EVENTS.change, mockChangeEventCb);
  document.addEventListener(NOTE_EVENTS.new, mockNewEventCb);
  document.addEventListener(NOTE_EVENTS.select, mockSelectEventCb);
  document.addEventListener(NOTE_EVENTS.unsynced, mockUnsyncedEventCb);
});

describe('Note store', () => {
  it('new Note()', () => {
    const emptyNote = new n.Note();
    const timestamp = Date.now();

    assert.strictEqual(typeof emptyNote.id, 'string');
    assert.lengthOf(emptyNote.id, 36);
    assert.isTrue(UUID_REGEX.test(emptyNote.id));
    // Math.floor to account for tiny discrepancies in Date.now
    assert.strictEqual(
      Math.floor(emptyNote.timestamp / 1000),
      Math.floor(timestamp / 1000)
    );
    assert.deepEqual(emptyNote.content.delta, {
      ops: [],
    });
    assert.strictEqual(emptyNote.content.title, '');
    assert.strictEqual(emptyNote.content.body, '');
  });

  describe('getAllNotes', () => {
    it('with undefined notes', async () => {
      const { calls, events } = mockApi({
        invoke: {
          error: 'get_all_notes',
        },
      });

      await n.getAllNotes();

      expect(mockNewEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(calls, 2);
      assert.isTrue(calls.has('get_all_notes'));
      assert.isTrue(calls.has('new_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('with empty note array', async () => {
      const { calls, events } = mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[]],
          },
        },
      });

      await n.getAllNotes();

      expect(mockNewEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(calls, 2);
      assert.isTrue(calls.has('get_all_notes'));
      assert.isTrue(calls.has('new_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('with notes', async () => {
      const { calls, events } = mockApi();

      await n.getAllNotes();

      expect(mockChangeEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 10);
      assert.deepEqual(n.noteState.notes[0], localNotes.sort(n.sortNotesFn)[0]);
      assert.deepEqual(n.noteState.notes[0], n.noteState.selectedNote);
      assert.lengthOf(calls, 1);
      assert.isTrue(calls.has('get_all_notes'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });
  });

  it('findNoteIndex', async () => {
    mockApi();

    await n.getAllNotes();

    const index = n.findNoteIndex(existingNote.id);

    assert.strictEqual(index, existingNoteIndexSorted);
    assert.strictEqual(n.findNoteIndex(), -1);
  });

  it('findNote', async () => {
    mockApi();

    await n.getAllNotes();

    const foundNote = n.findNote(existingNote.id);

    assert.isDefined(foundNote);
    assert.strictEqual(foundNote!.id, existingNote.id);
    assert.isUndefined(n.findNote(new n.Note().id));
  });

  it('selectNote', async () => {
    mockApi();

    await n.getAllNotes();

    vi.clearAllMocks();

    n.selectNote(existingNote.id);

    expect(mockSelectEventCb).toHaveBeenCalledOnce();
    expect(mockChangeEventCb).toHaveBeenCalledOnce();

    assert.deepEqual(
      n.noteState.selectedNote,
      n.noteState.notes[existingNoteIndexSorted]
    );

    vi.clearAllMocks();

    // Ensure clearNote works
    n.noteState.notes.push(new n.Note());
    n.selectNote(n.noteState.notes[10].id);
    n.selectNote(n.noteState.notes[9].id);

    // 3 = 2 (selectNote) + 1 (clearNote)
    expect(mockSelectEventCb).toHaveBeenCalledTimes(3);
    expect(mockChangeEventCb).toHaveBeenCalledTimes(3);

    assert.isUndefined(n.noteState.notes[10]);
  });

  it('isSelectedNote', async () => {
    mockApi();

    await n.getAllNotes();

    n.selectNote(existingNote.id);

    assert.isTrue(n.isSelectedNote(existingNote));

    const emptyNote = new n.Note();

    n.noteState.notes.push(emptyNote);
    n.selectNote(emptyNote.id);

    assert.isTrue(n.isSelectedNote(emptyNote));
    assert.isFalse(n.isSelectedNote(existingNote));
  });

  describe('deleteNote', () => {
    it('Deletes selected note and selects next', async () => {
      const { calls, events } = mockApi();

      await n.getAllNotes();

      n.selectNote(existingNote.id);

      assert.isDefined(n.findNote(existingNote.id));
      assert.deepEqual(n.noteState.selectedNote, existingNote);

      vi.clearAllMocks();
      clearMockApiResults({ calls, events });

      n.deleteNote(existingNote.id);

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();

      assert.notDeepEqual(n.noteState.selectedNote, existingNote);
      assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      assert.isUndefined(n.findNote(existingNote.id));
      assert.lengthOf(calls, 1);
      assert.isTrue(calls.has('delete_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('Without selecting next note', async () => {
      const { calls, events, promises } = mockApi();
      const otherExistingNote = { ...localNotes[1] };

      s.syncState.token = 'token';

      await n.getAllNotes();

      n.selectNote(n.noteState.notes[2].id);

      assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);

      vi.clearAllMocks();
      clearMockApiResults({ calls, events, promises });

      n.deleteNote(otherExistingNote.id);

      await Promise.all(promises);

      expect(mockSelectEventCb).not.toHaveBeenCalled();
      expect(mockChangeEventCb).not.toHaveBeenCalled();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();

      assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);
      assert.notDeepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      assert.isUndefined(n.findNote(otherExistingNote.id));
      assert.lengthOf(calls, 1);
      assert.isTrue(calls.has('delete_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('With no notes', async () => {
      const { calls, events } = mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[existingNote]],
          },
        },
      });

      await n.getAllNotes();

      assert.lengthOf(n.noteState.notes, 1);
      assert.deepEqual(n.noteState.selectedNote, existingNote);

      vi.clearAllMocks();
      clearMockApiResults({ calls, events });

      n.deleteNote(existingNote.id);

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.isUndefined(n.findNote(existingNote.id));
      assert.lengthOf(calls, 2);
      assert.isTrue(calls.has('delete_note'));
      assert.isTrue(calls.has('new_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('Resets unsynced new note', async () => {
      mockApi();

      await n.getAllNotes();

      s.syncState.unsyncedNoteIds.add({ new: existingNote.id });

      n.deleteNote(existingNote.id);

      assert.strictEqual(s.syncState.unsyncedNoteIds.new, '');
    });

    it('Calls autoPush', async () => {
      const { calls, events, promises } = mockApi();
      const otherExistingNote = { ...localNotes[1] };
      const autoPushSpy = vi.spyOn(s, 'autoPush');

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls, events, promises });

      n.deleteNote(otherExistingNote.id);

      await Promise.all(promises);
      await Promise.resolve();

      expect(autoPushSpy).toHaveBeenCalledOnce();

      assert.isUndefined(n.findNote(otherExistingNote.id));
      assert.lengthOf(calls, 1);
      assert.isTrue(calls.has('delete_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });
  });

  it('deleteSelectedNotes', async () => {
    const { calls, events } = mockApi();

    await n.getAllNotes();

    const currentSelectedNote = n.noteState.selectedNote;
    const notesSlice = n.noteState.notes.slice(2, 5);

    n.noteState.extraSelectedNotes = notesSlice;

    vi.clearAllMocks();
    clearMockApiResults({ calls, events });

    n.deleteSelectedNotes();

    expect(mockSelectEventCb).toHaveBeenCalledOnce();
    expect(mockChangeEventCb).toHaveBeenCalledOnce();
    expect(mockUnsyncedEventCb).toHaveBeenCalledTimes(notesSlice.length + 1);

    assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
    assert.isUndefined(n.findNote(currentSelectedNote.id));
    assert.isEmpty(n.noteState.extraSelectedNotes);
    assert.lengthOf(calls, notesSlice.length + 1);
    assert.isTrue(calls.has('delete_note', notesSlice.length + 1));
  });

  describe('newNote', () => {
    it("When selected note isn't empty", async () => {
      const emptyNote = new n.Note();
      const { calls, events } = mockApi();

      await n.getAllNotes();

      n.selectNote(existingNote.id);

      vi.clearAllMocks();
      clearMockApiResults({ calls, events });

      n.newNote();

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockNewEventCb).toHaveBeenCalledOnce();

      assert.notStrictEqual(n.noteState.selectedNote.id, emptyNote.id);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      assert.lengthOf(calls, 1);
      assert.isTrue(calls.has('new_note'));
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('Only updates timestamp when empty note selected', async () => {
      const { calls, events } = mockApi();
      const emptyNote = new n.Note();

      // Ensure reliable timestamp check later on
      await new Promise((res) => {
        setTimeout(res, 1);
      });

      await n.getAllNotes();

      n.noteState.notes.push(emptyNote);
      n.selectNote(emptyNote.id);

      vi.clearAllMocks();
      clearMockApiResults({ calls, events });

      n.newNote();

      expect(mockSelectEventCb).not.toHaveBeenCalled();
      expect(mockChangeEventCb).not.toHaveBeenCalled();
      expect(mockNewEventCb).not.toHaveBeenCalled();

      assert.strictEqual(n.noteState.selectedNote.id, emptyNote.id);
      assert.deepEqual(n.noteState.selectedNote.content, emptyNote.content);
      assert.notStrictEqual(n.noteState.selectedNote.timestamp, emptyNote.timestamp);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(calls, 0);
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });
  });

  it('editNote', async () => {
    const { calls, events } = mockApi();

    await n.getAllNotes();

    const currentSelectedNote = { ...n.noteState.selectedNote };

    vi.clearAllMocks();
    clearMockApiResults({ calls, events });

    n.editNote({ ops: [{ insert: 'Title\nBody' }] }, 'Title', 'Body');

    expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();

    assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
    assert.notDeepEqual(n.noteState.selectedNote.content, currentSelectedNote.content);
    assert.notStrictEqual(
      n.noteState.selectedNote.timestamp,
      currentSelectedNote.timestamp
    );
    assert.lengthOf(calls, 1);
    assert.isTrue(calls.has('edit_note'));
    assert.lengthOf(events.emits, 0);
    assert.lengthOf(events.listeners, 0);
  });

  describe('exportNotes', () => {
    it('All notes', async () => {
      const { calls, events } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls, events });

      await n.exportNotes(n.noteState.notes.map((nt) => nt.id));

      assert.lengthOf(calls, 2);
      assert.isTrue(calls.has('openDialog'));
      assert.isTrue(calls.has('export_notes'));
      assert.deepEqual(calls[0].calledWith, {
        directory: true,
        multiple: false,
        recursive: false,
        title: 'Choose a location',
      });
      assert.lengthOf(events.emits, 0);
      assert.lengthOf(events.listeners, 0);
    });

    it('Returns when no location chosen', async () => {
      const { calls, events } = mockApi({
        api: {
          resValue: {
            openDialog: [''],
          },
        },
      });

      await n.getAllNotes();

      clearMockApiResults({ calls, events });

      await n.exportNotes(n.noteState.notes.map((nt) => nt.id));

      assert.lengthOf(calls, 1);
      assert.isTrue(calls.has('openDialog'));
    });

    it('Passed selection of notes', async () => {
      const { calls, events } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls, events });

      await n.exportNotes([n.noteState.notes[0].id]);

      assert.lengthOf(calls, 2);
      assert.isTrue(calls.has('openDialog'));
      assert.isTrue(calls.has('export_notes'));
    });
  });
});
