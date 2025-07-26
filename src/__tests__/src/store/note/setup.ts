import { NOTE_EVENTS } from '../../../../constant';
import { getDummyNotes } from '../../../utils';

export const existingNoteIndexSorted = 2;
export const existingNote = getDummyNotes()[8]!;

export const mockChangeEventCB = vi.fn();
export const mockNewEventCB = vi.fn();
export const mockSelectEventCB = vi.fn();

export function setupMockNoteEventListeners() {
  document.addEventListener(NOTE_EVENTS.change, mockChangeEventCB);
  document.addEventListener(NOTE_EVENTS.new, mockNewEventCB);
  document.addEventListener(NOTE_EVENTS.select, mockSelectEventCB);
}
