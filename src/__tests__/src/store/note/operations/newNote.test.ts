import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { isEmptyNote } from '../../../../../utils';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { wait, waitUntil } from '../../../../utils';
import {
  existingNote,
  mockChangeEventCb,
  mockNewEventCb,
  mockSelectEventCb,
  setupMockNoteEventListeners,
} from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('newNote', () => {
  it("When selected note isn't empty", async () => {
    const { calls } = mockApi();

    await n.getAllNotes();

    n.selectNote(existingNote.uuid);

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
    const emptyNote = new Note();

    // Ensure reliable timestamp check later on
    await wait(10);
    await n.getAllNotes();

    n.noteState.notes.push(emptyNote);
    n.selectNote(emptyNote.uuid);

    vi.clearAllMocks();
    clearMockApiResults({ calls });

    n.newNote();

    expect(mockSelectEventCb).not.toHaveBeenCalled();
    expect(mockChangeEventCb).not.toHaveBeenCalled();
    expect(mockNewEventCb).not.toHaveBeenCalled();

    assert.strictEqual(n.noteState.selectedNote.uuid, emptyNote.uuid);
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
