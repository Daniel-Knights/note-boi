import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

import { isEmptyNote } from './utils';

export class Note {
  readonly id = uuidv4();
  timestamp = Date.now();
  content = {
    delta: '',
    title: '',
    body: '',
  };
}

interface State {
  notes: Note[];
  selectedNote: Note;
}

const newNoteEvent = new CustomEvent('note-new');
const selectNoteEvent = new CustomEvent('note-select');
const changeNoteEvent = new CustomEvent('note-change');

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

/** Deletes {@link state.selectedNote} when note is empty. */
function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;

  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote) return;

  if (isValidClear && isEmptyNote(foundNote)) {
    deleteNote(state.selectedNote.id);
  }
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id: string): void {
  if (state.selectedNote.id === id) return;

  clearEmptyNote();

  const foundNote = findNote(id);
  if (foundNote) state.selectedNote = { ...foundNote };

  document.dispatchEvent(selectNoteEvent);
  document.dispatchEvent(changeNoteEvent);
}

/** Fetches all notes and updates {@link state}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);

  const hasNotes = fetchedNotes && fetchedNotes.length > 0;
  if (!hasNotes) return newNote();

  state.notes = fetchedNotes;

  sortNotes();

  if (isEmptyNote(fetchedNotes[0]) && fetchedNotes.length === 1) {
    state.notes[0].timestamp = Date.now();
    // Clear these fields as whitespace-only can affect empty note checks
    state.notes[0].content.delta = '';
    state.notes[0].content.title = '';
    state.notes[0].content.body = '';
  }

  state.selectedNote = { ...state.notes[0] };

  clearEmptyNote();

  document.dispatchEvent(changeNoteEvent);
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  state.notes.splice(findNoteIndex(id), 1);
  state.selectedNote = { ...state.notes[0] };

  sortNotes();

  document.dispatchEvent(changeNoteEvent);

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

  document.dispatchEvent(changeNoteEvent);
  document.dispatchEvent(newNoteEvent);
}

/** Edits note body on Quill `text-change`. */
export function editBody(delta: string, title: string, body: string): void {
  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote || delta === foundNote.content.delta) return;

  const timestamp = Date.now();
  foundNote.timestamp = timestamp;
  state.selectedNote.timestamp = timestamp;

  foundNote.content = { delta, title, body };

  sortNotes();

  invoke('edit_note', { note: { ...foundNote } }).catch(console.error);
}
