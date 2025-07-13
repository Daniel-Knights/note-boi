import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { mockApi } from '../../../../mock';
import {
  existingNote,
  existingNoteIndexSorted,
  mockChangeEventCb,
  mockSelectEventCb,
  setupMockNoteEventListeners,
} from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

it('selectNote', async () => {
  mockApi();

  await n.getAllNotes();

  vi.clearAllMocks();

  n.selectNote(existingNote.uuid);

  expect(mockSelectEventCb).toHaveBeenCalledOnce();
  expect(mockChangeEventCb).toHaveBeenCalledOnce();

  assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[existingNoteIndexSorted]);

  vi.clearAllMocks();

  // Ensure clearNote works
  n.noteState.notes.push(new Note());
  n.selectNote(n.noteState.notes[10]!.uuid);
  n.selectNote(n.noteState.notes[9]!.uuid);

  // 3 = 2 (selectNote) + 1 (clearNote)
  expect(mockSelectEventCb).toHaveBeenCalledTimes(3);
  expect(mockChangeEventCb).toHaveBeenCalledTimes(3);

  assert.isUndefined(n.noteState.notes[10]);
});
