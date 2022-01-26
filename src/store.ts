import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

class Note {
  readonly id = '';
  title = '';
  body = '';
  readonly created_at = '';
  updated_at = '';
  [key: string]: string; // eslint-disable-line no-undef
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
 * Fetches all notes and updates {@link state}.
 *
 * @param updateExcludes Array of fields to skip updating for {@link state.selectedNote}.
 */
export async function getAllNotes(
  updateExcludes?: Array<'title' | 'body' | 'updated_at'>
): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);
  if (!fetchedNotes) return;

  state.notes = fetchedNotes;

  Object.keys(fetchedNotes[0]).forEach((key) => {
    const ex = updateExcludes as string[] | undefined;
    if (ex?.includes(key)) return; // Skip excluded fields

    state.selectedNote[key] = fetchedNotes[0][key];
  });
}

/** Deletes note with the given `id`, then re-fetches. */
export async function deleteNote(id: string): Promise<void> {
  await invoke('delete_note', { id }).catch(console.error);

  getAllNotes();
}

/** Deletes {@link state.selectedNote} when both `title` and `body` are empty. */
export function clearEmptyNote(): Promise<void> {
  if (state.selectedNote.title === '' && state.selectedNote.body === '') {
    return deleteNote(state.selectedNote.id);
  }

  return Promise.resolve();
}

/** Creates a new, empty note, then re-fetches. */
export async function newNote(): Promise<void> {
  await clearEmptyNote();
  await invoke<Note>('new_note', { ...new Note() }).catch(console.error);

  // TODO: Spamming cause content flash
  // TODO: Editing note then triggering this function causes edited note to be order as newer

  getAllNotes();
}

/** Edits note on `keyup` or `blur`, then re-fetches. */
export async function editNote(
  ev: KeyboardEvent | FocusEvent,
  field: 'title' | 'body'
): Promise<void> {
  const target = ev.target as HTMLElement;
  if (!target) return;

  const payload = { ...state.selectedNote };
  payload[field] = target.innerText;

  await invoke<Note>('edit_note', payload).catch(console.error);

  // Only exclude field if currently editing
  if (ev.type === 'keyup') {
    getAllNotes([field]);
  } else {
    getAllNotes(); // Update all on `blur`
  }
}

/**
 * Looks for note with given `id` in {@link state.notes},
 * and sets {@link state.selectedNote} with it.
 */
export async function selectNote(id: string): Promise<void> {
  await clearEmptyNote();

  const note = state.notes.find((nt) => nt.id === id);
  if (note) state.selectedNote = note;
}
