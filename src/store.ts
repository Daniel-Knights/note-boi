import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

import { testWhitespace } from './utils';

export class Note {
  readonly id = uuidv4();
  title = '';
  body = '';
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

/** Returns true if `title` and `body` are empty. */
export function isEmptyNote(note: Note): boolean {
  return testWhitespace(note.title) && testWhitespace(note.body);
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id: string): void {
  clearEmptyNote();

  const foundNote = findNote(id);
  if (foundNote) state.selectedNote = { ...foundNote };
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
export function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;

  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote) return;

  if (isValidClear && isEmptyNote(foundNote)) {
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
    fetchedNotes[0].timestamp = Date.now();
  }

  state.notes = fetchedNotes;

  sortNotes();

  state.selectedNote = { ...state.notes[0] };

  if (fetchedNotes.length > 1) clearEmptyNote();
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  state.notes.splice(findNoteIndex(id), 1);
  state.selectedNote = { ...state.notes[0] };

  sortNotes();

  invoke('delete_note', { id }).catch(console.error);
}

/** Creates an empty note. */
export function newNote(menuNoteList?: HTMLElement): void {
  const foundNote = findNote(state.selectedNote.id);

  menuNoteList?.scrollTo({ top: 0 });

  // Only update timestamp if selected note is empty
  if (foundNote && isEmptyNote(foundNote)) {
    state.selectedNote.timestamp = Date.now();
    return;
  }

  const emptyNote = new Note();
  state.notes.unshift(emptyNote);
  state.selectedNote = { ...emptyNote };

  invoke('new_note', state.selectedNote).catch(console.error);
}

/** Edits note on `keyup`. */
export function editNote(ev: Event, field: 'title' | 'body'): void {
  const target = ev.target as HTMLElement;
  if (!target) return;

  const foundNote = findNote(state.selectedNote.id);

  if (!foundNote || target.innerText === foundNote[field]) return;

  const timestamp = Date.now();
  foundNote.timestamp = timestamp;
  state.selectedNote.timestamp = timestamp;

  foundNote[field] = target.innerText;

  sortNotes();

  invoke('edit_note', { ...foundNote }).catch(console.error);
}
