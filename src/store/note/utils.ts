import { Note } from '../../classes';
import { isEmptyNote } from '../../utils';

import { deleteNote } from './operations';
import { noteState } from './state';

/** Sorts notes in descending order by timestamp. */
export const sortNotesFn = (a: Note, b: Note): number => b.timestamp - a.timestamp;

/** Sorts {@link noteState.notes} in descending order by timestamp. */
export const sortStateNotes = (): Note[] => noteState.notes.sort(sortNotesFn);

/** Finds note index within {@link noteState.notes}. */
export function findNoteIndex(uuid?: string): number {
  return noteState.notes.findIndex((nt) => nt.uuid === uuid);
}

/** Finds note within {@link noteState.notes}. */
export function findNote(uuid?: string): Note | undefined {
  return noteState.notes.find((nt) => nt.uuid === uuid);
}

/**
 * Returns true if note is either {@link noteState.selectedNote}
 * or within {@link noteState.extraSelectedNotes}.
 */
export function isSelectedNote(note: Note): boolean {
  return (
    note.uuid === noteState.selectedNote.uuid ||
    noteState.extraSelectedNotes.some((nt) => nt?.uuid === note.uuid)
  );
}

/** Deletes {@link noteState.selectedNote} when note is empty. */
export function clearEmptyNote(): void {
  const isValidClear = noteState.notes.length > 1;
  if (!isValidClear) return;

  const foundNote = findNote(noteState.selectedNote.uuid);
  if (!foundNote) return;

  if (isEmptyNote(foundNote)) {
    deleteNote(noteState.selectedNote.uuid);
  }
}
