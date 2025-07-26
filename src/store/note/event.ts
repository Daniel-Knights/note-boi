import { NOTE_EVENTS } from '../../constant';

export const newNoteEvent = new CustomEvent(NOTE_EVENTS.new);
export const selectNoteEvent = new CustomEvent(NOTE_EVENTS.select);
export const changeNoteEvent = new CustomEvent(NOTE_EVENTS.change);
