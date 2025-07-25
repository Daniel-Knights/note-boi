import * as n from '../../../../store/note';
import { NOTE_EVENTS } from '../../../../constant';
import { floorToThousand, getDummyNotes } from '../../../utils';

export const existingNoteIndexSorted = 2;
export const existingNote = getDummyNotes()[8]!;

export const mockChangeEventCB = vi.fn();
export const mockNewEventCB = vi.fn();
export const mockSelectEventCB = vi.fn();
export const mockUnsyncedEventCB = vi.fn();

export function setupMockNoteEventListeners() {
  document.addEventListener(NOTE_EVENTS.change, mockChangeEventCB);
  document.addEventListener(NOTE_EVENTS.new, mockNewEventCB);
  document.addEventListener(NOTE_EVENTS.select, mockSelectEventCB);

  document.addEventListener(
    NOTE_EVENTS.unsynced,
    (ev: CustomEventInit<n.UnsyncedEventDetail>) => {
      // Ensure `deleted_at` is floored to the nearest thousand so we can confidently assert
      if (ev.detail?.kind === 'deleted') {
        ev.detail.note.deleted_at = floorToThousand(ev.detail.note.deleted_at);
      }

      mockUnsyncedEventCB(ev.detail);
    }
  );
}
