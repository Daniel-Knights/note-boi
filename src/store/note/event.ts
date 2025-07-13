import { NOTE_EVENTS } from '../../constant';

import { UnsyncedEventDetail } from './types';

export const newNoteEvent = new CustomEvent(NOTE_EVENTS.new);
export const selectNoteEvent = new CustomEvent(NOTE_EVENTS.select);
export const changeNoteEvent = new CustomEvent(NOTE_EVENTS.change);

export function getUnsyncedEvent(detail: UnsyncedEventDetail) {
  return new CustomEvent(NOTE_EVENTS.unsynced, { detail });
}
