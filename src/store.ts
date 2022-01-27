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

  if (isValidClear && isEmpty) {
    const noteIndex = state.notes.findIndex((nt) => nt.id === id);

    state.notes.splice(noteIndex, 1);
  }
}

/** Fetches all notes and updates {@link state}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);
  if (!fetchedNotes) return;
  if (fetchedNotes.length <= 0) return newNote();

  state.notes = fetchedNotes;
  [state.selectedNote] = fetchedNotes;
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  const noteIndex = state.notes.findIndex((nt) => nt.id === id);

  state.notes.splice(noteIndex, 1);
}

/** Creates an empty note. */
export function newNote(): void {
  clearEmptyNote(true);

  state.notes.unshift(new Note());
  [state.selectedNote] = state.notes;
}

/** Edits note on `keyup` or `blur`. */
export function editNote(ev: KeyboardEvent, field: 'title' | 'body'): void {
  const target = ev.target as HTMLElement;
  if (!target) return;
  // Hasn't changed
  if (target.innerText === state.selectedNote[field]) return;

  const noteIndex = state.notes.findIndex((nt) => nt.id === state.selectedNote.id);

  state.notes[noteIndex] = state.selectedNote;
  state.selectedNote[field] = target.innerText;
}
