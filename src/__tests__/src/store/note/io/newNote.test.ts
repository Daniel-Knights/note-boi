import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { isEmptyNote } from '../../../../../utils';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { wait } from '../../../../utils';
import {
  existingNote,
  mockChangeEventCB,
  mockNewEventCB,
  mockSelectEventCB,
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

    expect(mockSelectEventCB).toHaveBeenCalledOnce();
    expect(mockChangeEventCB).toHaveBeenCalledOnce();
    expect(mockNewEventCB).toHaveBeenCalledOnce();

    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[0]);
    assert.strictEqual(calls.size, 0);
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

    expect(mockSelectEventCB).not.toHaveBeenCalled();
    expect(mockChangeEventCB).not.toHaveBeenCalled();
    expect(mockNewEventCB).not.toHaveBeenCalled();

    assert.strictEqual(n.noteState.selectedNote.uuid, emptyNote.uuid);
    assert.deepEqual(n.noteState.selectedNote.content, emptyNote.content);
    assert.notStrictEqual(n.noteState.selectedNote.timestamp, emptyNote.timestamp);
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.strictEqual(calls.size, 0);
  });
});
