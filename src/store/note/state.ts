import { reactive } from 'vue';

import { Note } from '../../classes';

import { selectNote } from './operations';
import { clearEmptyNote, sortStateNotes } from './utils';

export const noteState = reactive<{
  notes: Note[];
  selectedNote: Note;
  extraSelectedNotes: Note[];
  addNotes: typeof addNotes;
}>({
  notes: [],
  selectedNote: new Note(),
  extraSelectedNotes: [],
  addNotes,
});

function addNotes(notes: Note[], selectLatest = false) {
  // Filter out duplicates
  noteState.notes = noteState.notes.filter((stateNote) => {
    return notes.every((nt) => nt.uuid !== stateNote.uuid);
  });

  noteState.notes.push(...notes);
  sortStateNotes();

  if (selectLatest) {
    clearEmptyNote();
    selectNote(noteState.notes[0]?.uuid);
  }
}
