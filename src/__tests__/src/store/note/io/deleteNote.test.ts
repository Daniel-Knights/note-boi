import * as a from '../../../../../api';
import * as n from '../../../../../store/note';
import * as s from '../../../../../store/sync';
import { isEmptyNote } from '../../../../../utils';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { floorToThousand, getDummyNotes, waitForAutoSync } from '../../../../utils';
import {
  existingNote,
  mockChangeEventCB,
  mockSelectEventCB,
  setupMockNoteEventListeners,
} from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('deleteNote', () => {
  it('Deletes selected note and selects next', async () => {
    const { calls } = mockApi();

    await n.getAllNotes();

    n.selectNote(existingNote.uuid);

    assert.isDefined(n.findNote(existingNote.uuid));
    assert.deepEqual(n.noteState.selectedNote, existingNote);

    vi.clearAllMocks();
    clearMockApiResults({ calls });

    const deletedAt = Date.now();

    n.deleteNote(existingNote.uuid);

    expect(mockSelectEventCB).toHaveBeenCalledOnce();
    expect(mockChangeEventCB).toHaveBeenCalledOnce();

    const unsyncedDeletedNote = normaliseDeletedAt(s.syncState.unsyncedNotes.deleted[0]!);

    assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
    assert.deepEqual(unsyncedDeletedNote, {
      uuid: existingNote.uuid,
      deleted_at: floorToThousand(deletedAt),
    });
    assert.notDeepEqual(n.noteState.selectedNote, existingNote);
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
    assert.isUndefined(n.findNote(existingNote.uuid));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('delete_note'));
  });

  it('Without selecting next note', async () => {
    const { calls, promises } = mockApi();
    const otherExistingNote = { ...getDummyNotes()[1]! };

    s.syncState.isLoggedIn = true;

    await n.getAllNotes();

    n.selectNote(n.noteState.notes[2]!.uuid);

    assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);

    vi.clearAllMocks();
    clearMockApiResults({ calls, promises });

    const deletedAt = Date.now();

    n.deleteNote(otherExistingNote.uuid);

    await Promise.all(promises);

    expect(mockSelectEventCB).not.toHaveBeenCalled();
    expect(mockChangeEventCB).not.toHaveBeenCalled();

    const unsyncedDeletedNote = normaliseDeletedAt(s.syncState.unsyncedNotes.deleted[0]!);

    assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
    assert.deepEqual(unsyncedDeletedNote, {
      uuid: otherExistingNote.uuid,
      deleted_at: floorToThousand(deletedAt),
    });
    assert.notDeepEqual(n.noteState.selectedNote, otherExistingNote);
    assert.notDeepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
    assert.isUndefined(n.findNote(otherExistingNote.uuid));
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

    n.deleteNote(existingNote.uuid);

    expect(mockSelectEventCB).toHaveBeenCalledOnce();
    expect(mockChangeEventCB).toHaveBeenCalledOnce();

    const unsyncedDeletedNote = normaliseDeletedAt(s.syncState.unsyncedNotes.deleted[0]!);

    assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
    assert.deepEqual(unsyncedDeletedNote, {
      uuid: existingNote.uuid,
      deleted_at: floorToThousand(deletedAt),
    });
    assert.lengthOf(n.noteState.notes, 1);
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.isUndefined(n.findNote(existingNote.uuid));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('delete_note'));
  });

  it('Resets unsynced new note', async () => {
    mockApi();

    await n.getAllNotes();

    s.syncState.unsyncedNotes.set({ new: existingNote.uuid });

    n.deleteNote(existingNote.uuid);

    assert.strictEqual(s.syncState.unsyncedNotes.new, '');
  });

  it('Calls debounceSync', async () => {
    const { calls, promises } = mockApi();
    const otherExistingNote = { ...getDummyNotes()[1]! };
    const debounceSyncSpy = vi.spyOn(a, 'debounceSync');

    await n.getAllNotes();

    vi.clearAllMocks();
    clearMockApiResults({ calls, promises });

    await waitForAutoSync(() => n.deleteNote(otherExistingNote.uuid), calls);

    expect(debounceSyncSpy).toHaveBeenCalledOnce();

    assert.isUndefined(n.findNote(otherExistingNote.uuid));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('delete_note'));
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

    expect(mockSelectEventCB).toHaveBeenCalledOnce();
    expect(mockChangeEventCB).toHaveBeenCalledOnce();

    for (let i = 0; i < allNotesToDelete.length; i += 1) {
      const note = allNotesToDelete[i]!;
      const unsyncedDeletedNote = normaliseDeletedAt(
        s.syncState.unsyncedNotes.deleted[i]!
      );

      assert.deepEqual(unsyncedDeletedNote, {
        uuid: note.uuid,
        deleted_at: floorToThousand(deletedAt),
      });
    }

    assert.notDeepEqual(n.noteState.selectedNote, currentSelectedNote);
    assert.isUndefined(n.findNote(currentSelectedNote.uuid));
    assert.isEmpty(n.noteState.extraSelectedNotes);
    assert.strictEqual(calls.size, allNotesToDelete.length);
    assert.isTrue(calls.invoke.has('delete_note', allNotesToDelete.length));
  });
});

//// Utils

/**
 * Ensures `deleted_at` is floored to the nearest thousand for consistent assertions.
 */
function normaliseDeletedAt(nt: a.DeletedNote) {
  return {
    ...nt,
    deleted_at: floorToThousand(nt.deleted_at),
  };
}
