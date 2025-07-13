import * as n from '../../../../store/note';
import { NOTE_EVENTS } from '../../../../constant';
import { floorToThousand, getDummyNotes } from '../../../utils';

export const existingNoteIndexSorted = 2;
export const existingNote = getDummyNotes()[8]!;

export const mockChangeEventCb = vi.fn();
export const mockNewEventCb = vi.fn();
export const mockSelectEventCb = vi.fn();
export const mockUnsyncedEventCb = vi.fn();

export function setupMockNoteEventListeners() {
  document.addEventListener(NOTE_EVENTS.change, mockChangeEventCb);
  document.addEventListener(NOTE_EVENTS.new, mockNewEventCb);
  document.addEventListener(NOTE_EVENTS.select, mockSelectEventCb);

  document.addEventListener(
    NOTE_EVENTS.unsynced,
    (ev: CustomEventInit<n.UnsyncedEventDetail>) => {
      // Ensure `deleted_at` is floored to the nearest thousand so we can confidently assert
      if (ev.detail?.kind === 'deleted') {
        ev.detail.note.deleted_at = floorToThousand(ev.detail.note.deleted_at);
      }

      mockUnsyncedEventCb(ev.detail);
    }
  );
}
