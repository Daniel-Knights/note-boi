import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

class Note {
  readonly id = uuidv4();
  title = '';
  body = '';
  timestamp = new Date().getTime();
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

/** Returns true if `title` and `body` are empty. */
function isEmptyNote(note: Note) {
  return /^\s*$/.test(note.title) && /^\s*$/.test(note.body);
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id: string): void {
  clearEmptyNote();

  const note = state.notes.find((nt) => nt.id === id);
  if (note) state.selectedNote = note;
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
export function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;
  const isEmpty = isEmptyNote(state.selectedNote);

  if (isValidClear && isEmpty) {
    deleteNote(state.selectedNote.id);
  }
}

/** Fetches all notes and updates {@link state}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);

  const hasNotes = fetchedNotes && fetchedNotes.length > 0;
  if (!hasNotes) return newNote();

  const hasOneEmptyNote = fetchedNotes.length === 1 && isEmptyNote(fetchedNotes[0]);
  if (hasOneEmptyNote) {
    fetchedNotes[0].timestamp = new Date().getTime();
  }

  state.notes = fetchedNotes;

  sortNotes();

  [state.selectedNote] = state.notes;

  if (fetchedNotes.length > 1) clearEmptyNote();
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  state.notes.splice(findNoteIndex(id), 1);
  [state.selectedNote] = state.notes;

  sortNotes();

  invoke('delete_note', { id }).catch(console.error);
}

/** Creates an empty note. */
export function newNote(): void {
  // Only update timestamp if selected note is empty
  if (isEmptyNote(state.selectedNote)) {
    state.selectedNote.timestamp = new Date().getTime();
    return;
  }

  state.notes.unshift(new Note());
  [state.selectedNote] = state.notes;

  invoke('new_note', state.selectedNote).catch(console.error);
}

/** Edits note on `keyup`. */
export function editNote(ev: Event, field: 'title' | 'body'): void {
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
