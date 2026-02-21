import * as a from '../../../../../api';
import * as n from '../../../../../store/note';
import * as s from '../../../../../store/sync';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { waitForAutoSync } from '../../../../utils';
import { setupMockNoteEventListeners } from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('editNote', () => {
  it('Edits notes', async () => {
    const { calls } = mockApi();
    const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

    await n.getAllNotes();

    const currentSelectedNote = { ...n.noteState.selectedNote };
    const noteToEdit = { ...n.findNote(n.noteState.selectedNote.uuid)! };

    vi.clearAllMocks();
    clearMockApiResults({ calls });

    await waitForAutoSync(
      () => n.editNote({ ops: [{ insert: 'Title\nBody' }] }, 'Title', 'Body'),
      calls
    );

    expect(debounceSyncSpy).toHaveBeenCalledOnce();

    const editedNote = n.findNote(noteToEdit.uuid)!;

    assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
    assert.isTrue(s.syncState.unsyncedNotes.edited.has(noteToEdit.uuid));
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

  it('Sets new unsynced note if empty to prevent sync clear', async () => {
    const { calls } = mockApi();
    const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

    await n.getAllNotes();

    const currentSelectedNote = { ...n.noteState.selectedNote };
    const noteToEdit = { ...n.findNote(n.noteState.selectedNote.uuid)! };

    vi.clearAllMocks();
    clearMockApiResults({ calls });

    await waitForAutoSync(() => n.editNote({ ops: [{ insert: '' }] }, '', ''), calls);

    expect(debounceSyncSpy).toHaveBeenCalledOnce();

    const editedNote = n.findNote(noteToEdit.uuid)!;

    assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
    assert.strictEqual(s.syncState.unsyncedNotes.new, noteToEdit.uuid);
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
});
