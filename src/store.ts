import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

import { isEmptyNote } from './utils';

export class Note {
  readonly id = uuidv4();
  title = '';
  body = '';
  timestamp = Date.now();
}

interface State {
  notes: Note[];
  selectedId: string;
}

export const state = reactive<State>({
  notes: [],
  selectedId: '',
});

/** Sorts notes in descending order by timestamp. */
function sortNotes() {
  state.notes.sort((a, b) => b.timestamp - a.timestamp);
}

/** Finds note index within {@link state.notes}. */
function findNoteIndex(id: string) {
  return state.notes.findIndex((nt) => nt.id === id);
}

/** Finds note within {@link state.notes}. */
export function findNote(id: string): Note | undefined {
  return state.notes.find((nt) => nt.id === id);
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;

  const foundNote = findNote(state.selectedId);
  if (!foundNote) return;

  if (isValidClear && isEmptyNote(foundNote)) {
    deleteNote(state.selectedId);
  }
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id: string): void {
  if (state.selectedId === id) return;

  clearEmptyNote();

  const foundNote = findNote(id);
  if (foundNote) state.selectedId = id;
}

/** Fetches all notes and updates {@link state}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);

  const hasNotes = fetchedNotes && fetchedNotes.length > 0;
  if (!hasNotes) return newNote();

  state.notes = fetchedNotes;

  sortNotes();

  if (isEmptyNote(fetchedNotes[0])) {
    state.notes[0].timestamp = Date.now();
  }

  state.selectedId = state.notes[0].id;
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  state.notes.splice(findNoteIndex(id), 1);

  sortNotes();

  invoke('delete_note', { id }).catch(console.error);
}

/** Creates an empty note. */
export function newNote(): void {
  const foundNote = findNote(state.selectedId);

  // Only update timestamp if selected note is empty
  if (foundNote && isEmptyNote(foundNote)) {
    state.notes[0].timestamp = Date.now();
    return;
  }

  const freshNote = new Note();

  state.notes.unshift(freshNote);
  state.selectedId = freshNote.id;

  invoke('new_note', { ...freshNote }).catch(console.error);
}

/** Edits note on `input`. */
export function editNote(ev: Event, field: 'title' | 'body'): void {
  const target = ev.target as HTMLElement;
  if (!target) return;

  const foundNote = findNote(state.selectedId);

  if (!foundNote || target.innerText === foundNote[field]) return;

  foundNote.timestamp = Date.now();
  foundNote[field] = target.innerText;

  sortNotes();

  invoke('edit_note', { ...foundNote }).catch(console.error);
}
