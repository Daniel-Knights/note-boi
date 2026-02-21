import { Note } from '../../../classes';
import { noteState } from '../state';
import { sortStateNotes } from '../utils';

import { selectNote } from './selectNote';

/**
 * Adds notes to {@link noteState.notes}, filtering out duplicates.
 * Optionally selects the latest note.
 */
export function addNotes(notes: Note[], options = { selectLatest: false }) {
  // Filter out duplicates
  noteState.notes = noteState.notes.filter((stateNote) => {
    return notes.every((nt) => nt.uuid !== stateNote.uuid);
  });

  noteState.notes.push(...notes);
  sortStateNotes();

  if (options.selectLatest) {
    selectNote(noteState.notes[0]?.uuid);
  }
}
