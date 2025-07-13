import * as a from '../../../../../api';
import * as n from '../../../../../store/note';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { waitForAutoSync, waitUntil } from '../../../../utils';
import { mockUnsyncedEventCb, setupMockNoteEventListeners } from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('editNote', () => {
  it('Edits notes', async () => {
    const { calls } = mockApi();
    const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

    await n.getAllNotes();

    const currentSelectedNote = { ...n.noteState.selectedNote };
    const noteToEdit = { ...n.findNote(n.noteState.selectedNote.uuid) };

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
      note: noteToEdit.uuid,
    });

    const editedNote = n.findNote(noteToEdit.uuid)!;

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
