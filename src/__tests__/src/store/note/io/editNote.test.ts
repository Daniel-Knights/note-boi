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
    assert.isTrue(calls.invoke.has('delete_note'));
  });

  it('Marks synced note as deleted when emptied', async () => {
    const { calls } = mockApi();
    const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

    await n.getAllNotes();

    const noteToEdit = { ...n.findNote(n.noteState.selectedNote.uuid)! };

    // Simulate note being synced by adding to cache
    s.syncState.encryptedNotesCache.set(noteToEdit.uuid, {
      uuid: noteToEdit.uuid,
      content: 'encrypted',
      timestamp: noteToEdit.timestamp,
    });

    vi.clearAllMocks();
    clearMockApiResults({ calls });

    await waitForAutoSync(() => n.editNote({ ops: [{ insert: '' }] }, '', ''), calls);

    expect(debounceSyncSpy).toHaveBeenCalledOnce();

    assert.strictEqual(s.syncState.unsyncedNotes.deleted.length, 1);
    assert.strictEqual(s.syncState.unsyncedNotes.deleted[0]!.uuid, noteToEdit.uuid);
    assert.isEmpty(s.syncState.unsyncedNotes.new);
    assert.isFalse(s.syncState.encryptedNotesCache.has(noteToEdit.uuid));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('delete_note'));
  });

  it('Generates new UUID when adding content to deleted note', async () => {
    const { calls } = mockApi();
    const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

    await n.getAllNotes();

    const originalUuid = n.noteState.selectedNote.uuid;

    // Simulate note being marked as deleted
    s.syncState.unsyncedNotes.set({
      deleted: [{ uuid: originalUuid, deleted_at: Date.now() }],
    });

    vi.clearAllMocks();
    clearMockApiResults({ calls });

    await waitForAutoSync(
      () => n.editNote({ ops: [{ insert: 'New content' }] }, 'New content', ''),
      calls
    );

    expect(debounceSyncSpy).toHaveBeenCalledOnce();

    const editedNote = n.findNote(n.noteState.selectedNote.uuid)!;

    assert.notStrictEqual(n.noteState.selectedNote.uuid, originalUuid);
    assert.notStrictEqual(editedNote.uuid, originalUuid);
    assert.strictEqual(s.syncState.unsyncedNotes.deleted.length, 1);
    assert.strictEqual(s.syncState.unsyncedNotes.deleted[0]!.uuid, originalUuid);
    assert.isTrue(s.syncState.unsyncedNotes.edited.has(editedNote.uuid));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('edit_note'));
  });
});
