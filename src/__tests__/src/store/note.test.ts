import * as a from '../../../api';
import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { NOTE_EVENTS } from '../../../constant';
import { isEmptyNote } from '../../../utils';
import { UUID_REGEX } from '../../constant';
import { clearMockApiResults, mockApi } from '../../mock';
import {
  floorToThousand,
  getDummyNotes,
  wait,
  waitForAutoSync,
  waitUntil,
} from '../../utils';

const existingNoteIndexSorted = 2;
const existingNote = getDummyNotes()[8]!;

const mockChangeEventCb = vi.fn();
const mockNewEventCb = vi.fn();
const mockSelectEventCb = vi.fn();
const mockUnsyncedEventCb = vi.fn();

beforeAll(() => {
  document.addEventListener(NOTE_EVENTS.change, mockChangeEventCb);
  document.addEventListener(NOTE_EVENTS.new, mockNewEventCb);
  document.addEventListener(NOTE_EVENTS.select, mockSelectEventCb);

  document.addEventListener(
    NOTE_EVENTS.unsynced,
    (ev: CustomEventInit<n.UnsyncedEventDetail>) => {
      // Ensure `deleted_at` is floored to the nearest thousand so we can confidently assert
      if (ev.detail?.kind === 'deleted') {
        ev.detail.note.deleted_at = floorToThousand(ev.detail.note.deleted_at);
      }

      mockUnsyncedEventCb(ev.detail);
    }
  );
});

describe('Note store', () => {
  it('new Note()', () => {
    const emptyNote = new n.Note();
    const timestamp = Date.now();

    assert.strictEqual(typeof emptyNote.id, 'string');
    assert.lengthOf(emptyNote.id, 36);
    assert.isTrue(UUID_REGEX.test(emptyNote.id));
    assert.strictEqual(floorToThousand(emptyNote.timestamp), floorToThousand(timestamp));
    assert.deepEqual(emptyNote.content.delta, {
      ops: [],
    });
    assert.strictEqual(emptyNote.content.title, '');
    assert.strictEqual(emptyNote.content.body, '');
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

  it('catchNoteInvokeError', async () => {
    const { calls } = mockApi();
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const error = new Error('Test error');

    await n.catchNoteInvokeError(error);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);

    assert.strictEqual(calls.size, 1);
    assert.deepEqual(calls.tauriApi[0]!.calledWith, {
      message:
        'Something went wrong. Please try again or open an issue in the GitHub repo.',
      kind: 'error',
      okLabel: undefined,
      title: undefined,
    });
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
    n.selectNote(n.noteState.notes[10]!.id);
    n.selectNote(n.noteState.notes[9]!.id);

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

  describe('getAllNotes', () => {
    it('With undefined notes', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [] });

      await n.getAllNotes();

      expect(mockNewEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('get_all_notes'));
      assert.isTrue(calls.invoke.has('new_note'));
    });

    it('With empty note array', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[]] });

      await n.getAllNotes();

      expect(mockNewEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('get_all_notes'));
      assert.isTrue(calls.invoke.has('new_note'));
    });

    it('With single empty note', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[new n.Note()]] });

      await n.getAllNotes();

      expect(mockNewEventCb).not.toHaveBeenCalledOnce();
      expect(mockChangeEventCb).not.toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_all_notes'));
    });

    it('With notes', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      expect(mockChangeEventCb).toHaveBeenCalledOnce();

      assert.lengthOf(n.noteState.notes, 10);
      assert.deepEqual(n.noteState.notes[0], getDummyNotes().sort(n.sortNotesFn)[0]);
      assert.deepEqual(n.noteState.notes[0], n.noteState.selectedNote);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_all_notes'));
    });

    it('Catches error', async () => {
      const { calls, setErrorValue } = mockApi();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      setErrorValue.invoke('get_all_notes');

      await n.getAllNotes();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('new_note')); // `getAllNotes` throws, gets caught, and calls newNote
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message:
          'Something went wrong. Please try again or open an issue in the GitHub repo.',
        kind: 'error',
        okLabel: undefined,
        title: undefined,
      });
    });
  });

  describe('deleteNote', () => {
    it('Deletes selected note and selects next', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      n.selectNote(existingNote.id);

      assert.isDefined(n.findNote(existingNote.id));
      assert.deepEqual(n.noteState.selectedNote, existingNote);

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      const deletedAt = Date.now();

      n.deleteNote(existingNote.id);

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledWith({
        kind: 'deleted',
        note: {
          id: existingNote.id,
          deleted_at: floorToThousand(deletedAt),
        },
      });

      assert.notDeepEqual(n.noteState.selectedNote, existingNote);
      assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      assert.isUndefined(n.findNote(existingNote.id));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('delete_note'));
    });

    it('Without selecting next note', async () => {
      const { calls, promises } = mockApi();
      const otherExistingNote = { ...getDummyNotes()[1]! };

      s.syncState.isLoggedIn = true;

      await n.getAllNotes();

      n.selectNote(n.noteState.notes[2]!.id);

      assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      const deletedAt = Date.now();

      n.deleteNote(otherExistingNote.id);

      await Promise.all(promises);

      expect(mockSelectEventCb).not.toHaveBeenCalled();
      expect(mockChangeEventCb).not.toHaveBeenCalled();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledWith({
        kind: 'deleted',
        note: {
          id: otherExistingNote.id,
          deleted_at: floorToThousand(deletedAt),
        },
      });

      assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);
      assert.notDeepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      assert.isUndefined(n.findNote(otherExistingNote.id));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('delete_note'));
    });

    it('With no notes', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[existingNote]] });

      await n.getAllNotes();

      assert.lengthOf(n.noteState.notes, 1);
      assert.deepEqual(n.noteState.selectedNote, existingNote);

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      const deletedAt = Date.now();

      n.deleteNote(existingNote.id);

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledWith({
        kind: 'deleted',
        note: {
          id: existingNote.id,
          deleted_at: floorToThousand(deletedAt),
        },
      });

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.isUndefined(n.findNote(existingNote.id));
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('delete_note'));
      assert.isTrue(calls.invoke.has('new_note'));
    });

    it('Resets unsynced new note', async () => {
      mockApi();

      await n.getAllNotes();

      s.syncState.unsyncedNotes.set({ new: existingNote.id });

      n.deleteNote(existingNote.id);

      assert.strictEqual(s.syncState.unsyncedNotes.new, '');
    });

    it('Calls debounceSync', async () => {
      const { calls, promises } = mockApi();
      const otherExistingNote = { ...getDummyNotes()[1]! };
      const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      await waitForAutoSync(() => n.deleteNote(otherExistingNote.id), calls);

      expect(debounceSyncSpy).toHaveBeenCalledOnce();

      assert.isUndefined(n.findNote(otherExistingNote.id));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('delete_note'));
    });

    it('Catches error', async () => {
      const { calls, setErrorValue } = mockApi();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls });
      setErrorValue.invoke('delete_note');

      n.deleteNote(existingNote.id);

      await waitUntil(() => calls.tauriApi.has('plugin:dialog|message'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message:
          'Something went wrong. Please try again or open an issue in the GitHub repo.',
        kind: 'error',
        okLabel: undefined,
        title: undefined,
      });
    });
  });

  describe('deleteSelectedNotes', () => {
    it('Deletes selected notes', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      const currentSelectedNote = n.noteState.selectedNote;
      const notesSlice = n.noteState.notes.slice(2, 5);
      const allNotesToDelete = [currentSelectedNote, ...notesSlice];

      n.noteState.extraSelectedNotes = notesSlice;

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      const deletedAt = Date.now();

      n.deleteSelectedNotes();

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledTimes(allNotesToDelete.length);

      for (let i = 0; i < allNotesToDelete.length; i += 1) {
        const note = allNotesToDelete[i]!;

        expect(mockUnsyncedEventCb).nthCalledWith(i + 1, {
          kind: 'deleted',
          note: {
            id: note.id,
            deleted_at: floorToThousand(deletedAt),
          },
        });
      }

      assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
      assert.isUndefined(n.findNote(currentSelectedNote.id));
      assert.isEmpty(n.noteState.extraSelectedNotes);
      assert.strictEqual(calls.size, allNotesToDelete.length);
      assert.isTrue(calls.invoke.has('delete_note', allNotesToDelete.length));
    });

    it('Catches error', async () => {
      const { calls, setErrorValue } = mockApi();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls });
      setErrorValue.invoke('delete_note');

      n.deleteSelectedNotes();

      await waitUntil(() => calls.tauriApi.has('plugin:dialog|message'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message:
          'Something went wrong. Please try again or open an issue in the GitHub repo.',
        kind: 'error',
        okLabel: undefined,
        title: undefined,
      });
    });
  });

  describe('newNote', () => {
    it("When selected note isn't empty", async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      n.selectNote(existingNote.id);

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      n.newNote();

      expect(mockSelectEventCb).toHaveBeenCalledOnce();
      expect(mockChangeEventCb).toHaveBeenCalledOnce();
      expect(mockNewEventCb).toHaveBeenCalledOnce();

      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('new_note'));
    });

    it('Only updates timestamp when empty note selected', async () => {
      const { calls } = mockApi();
      const emptyNote = new n.Note();

      // Ensure reliable timestamp check later on
      await wait(10);
      await n.getAllNotes();

      n.noteState.notes.push(emptyNote);
      n.selectNote(emptyNote.id);

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      n.newNote();

      expect(mockSelectEventCb).not.toHaveBeenCalled();
      expect(mockChangeEventCb).not.toHaveBeenCalled();
      expect(mockNewEventCb).not.toHaveBeenCalled();

      assert.strictEqual(n.noteState.selectedNote.id, emptyNote.id);
      assert.deepEqual(n.noteState.selectedNote.content, emptyNote.content);
      assert.notStrictEqual(n.noteState.selectedNote.timestamp, emptyNote.timestamp);
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(calls.size, 0);
    });

    it('Catches error', async () => {
      const { calls, setErrorValue } = mockApi();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls });
      setErrorValue.invoke('new_note');

      n.newNote();

      await waitUntil(() => calls.tauriApi.has('plugin:dialog|message'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message:
          'Something went wrong. Please try again or open an issue in the GitHub repo.',
        kind: 'error',
        okLabel: undefined,
        title: undefined,
      });
    });
  });

  describe('editNote', () => {
    it('Edits notes', async () => {
      const { calls } = mockApi();
      const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

      await n.getAllNotes();

      const currentSelectedNote = { ...n.noteState.selectedNote };
      const noteToEdit = { ...n.findNote(n.noteState.selectedNote.id) };

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      await waitForAutoSync(
        () => n.editNote({ ops: [{ insert: 'Title\nBody' }] }, 'Title', 'Body'),
        calls
      );

      expect(debounceSyncSpy).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCb).toHaveBeenCalledWith({
        kind: 'edited',
        note: noteToEdit.id,
      });

      const editedNote = n.findNote(noteToEdit.id)!;

      assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
      assert.notDeepEqual(editedNote, noteToEdit);
      // See `editNote` for why selectedNote content should remain the same
      assert.deepEqual(n.noteState.selectedNote.content, currentSelectedNote.content);
      assert.notStrictEqual(
        n.noteState.selectedNote.timestamp,
        currentSelectedNote.timestamp
      );
      assert.notStrictEqual(editedNote.timestamp, noteToEdit.timestamp);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('edit_note'));
    });

    it('Catches error', async () => {
      const { calls, setErrorValue } = mockApi();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls });
      setErrorValue.invoke('edit_note');

      n.editNote({ ops: [{ insert: 'Title\nBody' }] }, 'Title', 'Body');

      await waitUntil(() => calls.tauriApi.has('plugin:dialog|message'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message:
          'Something went wrong. Please try again or open an issue in the GitHub repo.',
        kind: 'error',
        okLabel: undefined,
        title: undefined,
      });
    });
  });

  describe('exportNotes', () => {
    it('All notes', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls });

      await n.exportNotes(n.noteState.notes.map((nt) => nt.id));

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.invoke.has('export_notes'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        directory: true,
        multiple: false,
        recursive: false,
        title: 'Choose a location',
      });
    });

    it('Returns when no location chosen', async () => {
      const { calls, setResValues } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls });
      setResValues.tauriApi({ openDialog: [''] });

      await n.exportNotes(n.noteState.notes.map((nt) => nt.id));

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    });

    it('Passed selection of notes', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls });

      await n.exportNotes([n.noteState.notes[0]!.id]);

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.invoke.has('export_notes'));
    });

    it('Catches error', async () => {
      const { calls, setErrorValue } = mockApi();
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await n.getAllNotes();

      clearMockApiResults({ calls });
      setErrorValue.invoke('export_notes');

      await n.exportNotes(n.noteState.notes.map((nt) => nt.id));

      await waitUntil(() => calls.tauriApi.has('plugin:dialog|message'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Note invoke error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Mock Tauri Invoke error'));

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.deepEqual(calls.tauriApi[1]!.calledWith, {
        message:
          'Something went wrong. Please try again or open an issue in the GitHub repo.',
        kind: 'error',
        okLabel: undefined,
        title: undefined,
      });
    });
  });
});
