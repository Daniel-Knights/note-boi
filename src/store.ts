import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';

export class Note {
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

/** Finds note within {@link state.notes}. */
export function findNote(id: string): Note | undefined {
  return state.notes.find((nt) => nt.id === id);
}

/** Returns true if `title` and `body` are empty. */
export function isEmptyNote(note: Note): boolean {
  return /^\s*$/.test(note.title) && /^\s*$/.test(note.body);
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets it to {@link state.selectedNote}.
 */
export function selectNote(id: string): void {
  clearEmptyNote();

  const note = findNote(id);
  if (note) state.selectedNote = { ...note };
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
export function clearEmptyNote(): void {
  const isValidClear = state.notes.length > 1;

  const note = findNote(state.selectedNote.id);
  if (!note) return;

  if (isValidClear && isEmptyNote(note)) {
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
  const note = findNote(state.selectedNote.id);

  menuNoteList?.scrollTo({ top: 0 });

  // Only update timestamp if selected note is empty
  if (note && isEmptyNote(note)) {
    state.selectedNote.timestamp = new Date().getTime();
    return;
  }

  state.notes.unshift(new Note());
  state.selectedNote = { ...state.notes[0] };

  invoke('new_note', state.selectedNote).catch(console.error);
}

/** Edits note on `keyup`. */
export function editNote(ev: Event, field: 'title' | 'body'): void {
  const target = ev.target as HTMLElement;
  if (!target) return;

  const note = findNote(state.selectedNote.id);

  if (!note || target.innerText === note[field]) return;

  const timestamp = new Date().getTime();
  note.timestamp = timestamp;
  state.selectedNote.timestamp = timestamp;

  note[field] = target.innerText;

  sortNotes();

  invoke('edit_note', { ...note }).catch(console.error);
}
