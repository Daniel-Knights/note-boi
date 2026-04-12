import { reactive } from 'vue';

import { DeletedNote } from '../../api';
import { Note } from '../../classes';

export const noteState = reactive<{
  notes: Note[];
  deletedNotes: DeletedNote[];
  selectedNote: Note;
  extraSelectedNotes: Note[];
}>({
  notes: [],
  deletedNotes: [],
  selectedNote: new Note(),
  extraSelectedNotes: [],
});
