import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

import { isEmptyNote } from './utils';

export class Note {
  readonly id = uuidv4();
  body = {
    delta: '',
    text: '',
  };
  timestamp = Date.now();
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

/** Finds note within {@link state.notes}. */
export function findNote(id: string): Note | undefined {
  return state.notes.find((nt) => nt.id === id);
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;

  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote) return;

  if (isValidClear && isEmptyNote(foundNote)) {
    deleteNote(state.selectedNote.id);
  }
}

const selectEvent = new CustomEvent('note-select');

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id: string): void {
  if (state.selectedNote.id === id) return;

  clearEmptyNote();

  const foundNote = findNote(id);
  if (foundNote) state.selectedNote = { ...foundNote };

  document.dispatchEvent(selectEvent);
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

  state.selectedNote = { ...state.notes[0] };

  document.dispatchEvent(selectEvent);
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  state.notes.splice(findNoteIndex(id), 1);
  state.selectedNote = { ...state.notes[0] };

  sortNotes();

  invoke('delete_note', { id }).catch(console.error);
}

/** Creates an empty note. */
export function newNote(): void {
  const foundNote = findNote(state.selectedNote.id);

  // Only update timestamp if selected note is empty
  if (foundNote && isEmptyNote(foundNote)) {
    state.selectedNote.timestamp = Date.now();
    return;
  }

  const freshNote = new Note();

  state.notes.unshift(freshNote);
  state.selectedNote = { ...freshNote };

  invoke('new_note', { note: { ...freshNote } }).catch(console.error);

  document.dispatchEvent(selectEvent);
}

/** Edits note body on Quill `text-change`. */
export function editBody(delta: string, text: string): void {
  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote || text === foundNote.body.text) return;

  const timestamp = Date.now();
  foundNote.timestamp = timestamp;
  state.selectedNote.timestamp = timestamp;

  foundNote.body = { delta, text };

  sortNotes();

  invoke('edit_note', { note: { ...foundNote } }).catch(console.error);
}
