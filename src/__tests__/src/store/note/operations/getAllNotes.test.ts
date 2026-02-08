import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { isEmptyNote } from '../../../../../utils';
import { mockApi } from '../../../../mock';
import { getDummyNotes } from '../../../../utils';
import { mockChangeEventCB, mockNewEventCB, setupMockNoteEventListeners } from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('getAllNotes', () => {
  it('With undefined notes', async () => {
    const { calls, setResValues } = mockApi();

    setResValues.invoke({ get_all_notes: [] });

    await n.getAllNotes();

    expect(mockNewEventCB).toHaveBeenCalledOnce();

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

    expect(mockNewEventCB).toHaveBeenCalledOnce();

    assert.lengthOf(n.noteState.notes, 1);
    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.invoke.has('get_all_notes'));
    assert.isTrue(calls.invoke.has('new_note'));
  });

  it('With single empty note', async () => {
    const { calls, setResValues } = mockApi();

    setResValues.invoke({ get_all_notes: [[new Note()]] });

    await n.getAllNotes();

    expect(mockNewEventCB).not.toHaveBeenCalledOnce();
    expect(mockChangeEventCB).not.toHaveBeenCalledOnce();

    assert.lengthOf(n.noteState.notes, 1);
    assert.isTrue(isEmptyNote(n.noteState.notes[0]));
    assert.isTrue(isEmptyNote(n.noteState.selectedNote));
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('get_all_notes'));
  });

  it('With notes', async () => {
    const { calls } = mockApi();

    await n.getAllNotes();

    expect(mockChangeEventCB).toHaveBeenCalledOnce();

    assert.lengthOf(n.noteState.notes, 10);
    assert.deepEqual(n.noteState.notes[0], getDummyNotes().sort(n.sortNotesFn)[0]);
    assert.deepEqual(n.noteState.notes[0], n.noteState.selectedNote);
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.invoke.has('get_all_notes'));
  });
});
