import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

class Note {
  readonly id = '';
  title = '';
  body = '';
  modified = '';
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
 * @param updateOnly Array of fields to update for {@link state.selectedNote}.
 */
export async function getAllNotes(
  updateOnly?: Array<'title' | 'body' | 'modified'>
): Promise<void> {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch(console.error);
  if (!fetchedNotes) return;

  state.notes = fetchedNotes;

  if (updateOnly) {
    updateOnly.forEach((field) => {
      state.selectedNote[field] = fetchedNotes[0][field];
    });
  } else {
    [state.selectedNote] = fetchedNotes;
  }
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

  getAllNotes();
}

/** Edits note on `keyup` or `blur`, then re-fetches. */
export async function editNote(
  ev: KeyboardEvent | FocusEvent,
  field: 'title' | 'body'
): Promise<void> {
  const target = ev.target as HTMLElement;
  if (!target) return;
  // Hasn't changed
  if (target.innerText === state.selectedNote[field]) return;

  const payload = { ...state.selectedNote };
  payload[field] = target.innerText;

  await invoke<Note>('edit_note', payload).catch(console.error);

  const isKeyup = ev instanceof KeyboardEvent;
  // Only update `modified` if currently editing
  const updateOnly: 'modified'[] | undefined = isKeyup ? ['modified'] : undefined;

  getAllNotes(updateOnly);
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
