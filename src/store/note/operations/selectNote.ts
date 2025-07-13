import { changeNoteEvent, selectNoteEvent } from '../event';
import { noteState } from '../state';
import { clearEmptyNote, findNote } from '../utils';

/**
 * Looks for note with given `uuid` in {@link noteState.notes},
 * and sets it to {@link noteState.selectedNote}.
 */
export function selectNote(uuid?: string): boolean {
  if (noteState.selectedNote.uuid === uuid) return false;

  clearEmptyNote();

  const foundNote = findNote(uuid);
  if (!foundNote) return false;

  noteState.selectedNote = { ...foundNote };

  document.dispatchEvent(selectNoteEvent);
  document.dispatchEvent(changeNoteEvent);

  return true;
}
