import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

import { isEmptyNote } from '../utils';
import { autoPush } from './sync';

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
  /** `0` = next in queue */
  extraSelectedNotes: (Note | undefined)[];
}

const newNoteEvent = new CustomEvent('note-new');
const selectNoteEvent = new CustomEvent('note-select');
const changeNoteEvent = new CustomEvent('note-change');
const unsyncedEvent = new CustomEvent('note-unsynced');

export const state = reactive<State>({
  notes: [],
  selectedNote: new Note(),
  extraSelectedNotes: [],
});

/** Sorts notes in descending order by timestamp. */
function sortNotes() {
  state.notes.sort((a, b) => b.timestamp - a.timestamp);
}

/** Finds note index within {@link state.notes}. */
export function findNoteIndex(id?: string): number {
  return state.notes.findIndex((nt) => nt.id === id);
}

/** Finds note within {@link state.notes}. */
export function findNote(id?: string): Note | undefined {
  return state.notes.find((nt) => nt.id === id);
}

/** Deletes {@link state.selectedNote} when note is empty. */
function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;
  if (!isValidClear) return;

  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote) return;

  if (isEmptyNote(foundNote)) {
    deleteNote(state.selectedNote.id, true);
  }
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id?: string): void {
  if (state.selectedNote.id === id) return;

  clearEmptyNote();

  const foundNote = findNote(id);
  if (!foundNote) return;

  state.selectedNote = { ...foundNote };

  document.dispatchEvent(selectNoteEvent);
  document.dispatchEvent(changeNoteEvent);
}

/**
 * Returns true if note is either {@link state.selectedNote}
 * or within {@link state.extraSelectedNotes}
 */
export function isSelectedNote(note: Note): boolean {
  return (
    note.id === state.selectedNote.id ||
    state.extraSelectedNotes.some((nt) => nt?.id === note.id)
  );
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
export function deleteNote(id: string, selectNextNote: boolean): void {
  state.notes.splice(findNoteIndex(id), 1);

  if (state.notes.length === 0) newNote();

  if (selectNextNote) {
    state.selectedNote = { ...state.notes[0] };
  }

  document.dispatchEvent(changeNoteEvent);
  document.dispatchEvent(unsyncedEvent);

  invoke('delete_note', { id }).then(autoPush).catch(console.error);
}

/** Deletes {@link state.selectedNote} and all notes in {@link state.extraSelectedNotes}. */
export function deleteAllNotes(): void {
  deleteNote(state.selectedNote.id, true);

  state.extraSelectedNotes.forEach((nt) => {
    if (nt) deleteNote(nt.id, false);
  });

  state.extraSelectedNotes = [];
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

  document.dispatchEvent(changeNoteEvent);
  document.dispatchEvent(newNoteEvent);
  document.dispatchEvent(unsyncedEvent);

  invoke('new_note', { note: { ...freshNote } }).catch(console.error);
}

/** Edits note body on Quill `text-change`. */
export function editNote(delta: string, title: string, body: string): void {
  const foundNote = findNote(state.selectedNote.id);
  if (!foundNote || delta === foundNote.content.delta) return;

  const timestamp = Date.now();
  foundNote.timestamp = timestamp;
  state.selectedNote.timestamp = timestamp;

  foundNote.content = { delta, title, body: body || '' };

  sortNotes();

  document.dispatchEvent(unsyncedEvent);

  invoke('edit_note', { note: { ...foundNote } })
    .then(autoPush)
    .catch(console.error);
}
