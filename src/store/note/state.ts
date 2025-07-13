import { reactive } from 'vue';

import { Note } from '../../classes';

export const noteState = reactive<{
  notes: Note[];
  selectedNote: Note;
  extraSelectedNotes: Note[];
}>({
  notes: [],
  selectedNote: new Note(),
  extraSelectedNotes: [],
});
