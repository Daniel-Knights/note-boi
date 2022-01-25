import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface State {
  notes: Note[];
  selectedNote: Note | undefined;
}

export const state = reactive<State>({
  notes: [],
  selectedNote: undefined,
});

export function selectNote(id: string): void {
  state.selectedNote = state.notes.find((nt) => nt.id === id) || state.notes[0];
}

export async function newNote(): Promise<void> {
  const res = await invoke<Note>('new_note', {
    title: '',
    body: '',
  }).catch((err) => {
    console.error(err);
  });

  if (!res) return;

  state.notes.unshift(res);
  state.selectedNote = res;

  console.log(res);
}

export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch((err) => {
    console.error(err);
  });

  if (!fetchedNotes) return;

  state.notes = fetchedNotes;
  [state.selectedNote] = fetchedNotes;

  console.log(state.notes);
}

export async function deleteNote(id: string): Promise<void> {
  const res = await invoke('delete_note', { id }).catch((err) => {
    console.error(err);
  });

  if (!res) return;

  const noteIndex = state.notes.findIndex((nt) => nt.id === id);

  state.notes.splice(noteIndex, 1);

  console.log(state.notes);
}

export async function editNote(id: string): Promise<void> {
  const res = await invoke<Note>('edit_note', {
    id,
    title: state.selectedNote?.title,
    body: state.selectedNote?.body,
  }).catch((err) => {
    console.error(err);
  });

  if (!res) return;

  state.notes = state.notes.filter((note) => note.id !== id);
  state.notes.unshift(res);

  console.log(res);
}
