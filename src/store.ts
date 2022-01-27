import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

class Note {
  readonly id = uuidv4();
  title = '';
  body = '';
  timestamp = new Date().getTime();
  [key: string]: string | number; // eslint-disable-line no-undef
}

interface State {
  notes: Note[];
  selectedNote: Note;
}

export const state = reactive<State>({
  notes: [],
  selectedNote: new Note(),
});

/** Sorts notes in descending order by timestamp. */
function sortNotes() {
  state.notes.sort((a, b) => b.timestamp - a.timestamp);
}

/** Finds note index within {@link state.notes}. */
function findNoteIndex(id: string) {
  return state.notes.findIndex((nt) => nt.id === id);
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets {@link state.selectedNote} with it.
 */
export function selectNote(id: string): void {
  clearEmptyNote();

  const note = state.notes.find((nt) => nt.id === id);
  if (note) state.selectedNote = note;
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
export function clearEmptyNote(isNewNote?: boolean): void {
  const { id, title, body } = state.selectedNote;

  const isValidClear = state.notes.length > 1 || isNewNote;
  const isEmpty = title === '' && body === '';

  if (isValidClear && isEmpty) deleteNote(id);
}

/** Fetches all notes and updates {@link state}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);
  if (!fetchedNotes) return;
  if (fetchedNotes.length <= 0) return newNote();

  state.notes = fetchedNotes;

  sortNotes();

  [state.selectedNote] = state.notes;
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  state.notes.splice(findNoteIndex(id), 1);

  sortNotes();

  invoke('delete_note', { id }).catch(console.error);
}

/** Creates an empty note. */
export function newNote(): void {
  clearEmptyNote(true);

  state.notes.unshift(new Note());
  [state.selectedNote] = state.notes;

  invoke('new_note', state.selectedNote).catch(console.error);
}

/** Edits note on `keyup` or `blur`. */
export function editNote(ev: KeyboardEvent, field: 'title' | 'body'): void {
  const target = ev.target as HTMLElement;
  if (!target) return;
  if (target.innerText === state.selectedNote[field]) return;

  const noteIndex = findNoteIndex(state.selectedNote.id);

  state.selectedNote.timestamp = new Date().getTime();
  state.notes[noteIndex] = state.selectedNote;
  state.selectedNote[field] = target.innerText;

  sortNotes();

  invoke('edit_note', state.selectedNote).catch(console.error);
}
