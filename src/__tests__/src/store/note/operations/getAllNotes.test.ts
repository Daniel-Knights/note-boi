import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { isEmptyNote } from '../../../../../utils';
import { mockApi } from '../../../../mock';
import { getDummyNotes } from '../../../../utils';
import { mockChangeEventCb, mockNewEventCb, setupMockNoteEventListeners } from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
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

    setResValues.invoke({ get_all_notes: [[new Note()]] });

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
