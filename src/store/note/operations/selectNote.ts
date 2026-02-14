import { dispatchNoteEvent } from '../event';
import { noteState } from '../state';
import { clearEmptyNote, findNote } from '../utils';

/**
 * Looks for note with given `uuid` in {@link noteState.notes},
 * and sets it to {@link noteState.selectedNote}.
 */
export function selectNote(uuid?: string) {
  if (noteState.selectedNote.uuid === uuid) return;

  clearEmptyNote();

  const foundNote = findNote(uuid);
  if (!foundNote) return;

  noteState.selectedNote = foundNote.clone();

  dispatchNoteEvent('note-select');
  dispatchNoteEvent('note-change');
}
