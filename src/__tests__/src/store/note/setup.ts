import { addNoteEventListener } from '../../../../store/note';
import { getDummyNotes } from '../../../utils';

export const existingNoteIndexSorted = 2;
export const existingNote = getDummyNotes()[8]!;

export const mockNewEventCB = vi.fn();
export const mockSelectEventCB = vi.fn();
export const mockChangeEventCB = vi.fn();

export function setupMockNoteEventListeners() {
  addNoteEventListener('note-new', mockNewEventCB);
  addNoteEventListener('note-select', mockSelectEventCB);
  addNoteEventListener('note-change', mockChangeEventCB);
}
