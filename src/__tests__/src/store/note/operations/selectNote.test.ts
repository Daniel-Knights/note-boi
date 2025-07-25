import * as n from '../../../../../store/note';
import { Note } from '../../../../../classes';
import { mockApi } from '../../../../mock';
import {
  existingNote,
  existingNoteIndexSorted,
  mockChangeEventCB,
  mockSelectEventCB,
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

  expect(mockSelectEventCB).toHaveBeenCalledOnce();
  expect(mockChangeEventCB).toHaveBeenCalledOnce();

  assert.deepEqual(n.noteState.selectedNote, n.noteState.notes[existingNoteIndexSorted]);

  vi.clearAllMocks();

  // Ensure clearNote works
  n.noteState.notes.push(new Note());
  n.selectNote(n.noteState.notes[10]!.uuid);
  n.selectNote(n.noteState.notes[9]!.uuid);

  // 3 = 2 (selectNote) + 1 (clearNote)
  expect(mockSelectEventCB).toHaveBeenCalledTimes(3);
  expect(mockChangeEventCB).toHaveBeenCalledTimes(3);

  assert.isUndefined(n.noteState.notes[10]);
});
