import * as dialog from '@tauri-apps/plugin-dialog';
import type Delta from 'quill-delta';
import { reactive } from 'vue';

import { debounceSync } from '../api';
import { UnsyncedNotesManager } from '../classes';
import { NOTE_EVENTS } from '../constant';
import { isEmptyNote, tauriInvoke } from '../utils';

import { syncState } from './sync';

export type UnsyncedEventDetail = {
  noteId: string;
  kind: keyof Pick<UnsyncedNotesManager, 'edited' | 'deleted'>;
};

export class Note {
  readonly id: string = crypto.randomUUID();
  timestamp = Date.now();
  content: NoteContent = {
    title: '',
    body: '',
    delta: {
      ops: [],
    },
  };
}

type NoteContent = {
  title: string;
  body: string;
  delta: Partial<Delta>;
};

export const noteState = reactive<{
  notes: Note[];
  selectedNote: Note;
  extraSelectedNotes: Note[];
}>({
  notes: [],
  selectedNote: new Note(),
  extraSelectedNotes: [],
});

const newNoteEvent = new CustomEvent(NOTE_EVENTS.new);
export const selectNoteEvent = new CustomEvent(NOTE_EVENTS.select);
export const changeNoteEvent = new CustomEvent(NOTE_EVENTS.change);

function getUnsyncedEvent(
  noteId: UnsyncedEventDetail['noteId'],
  kind: UnsyncedEventDetail['kind']
) {
  return new CustomEvent(NOTE_EVENTS.unsynced, { detail: { noteId, kind } });
}

/** Sorts notes in descending order by timestamp. */
export const sortNotesFn = (a: Note, b: Note): number => b.timestamp - a.timestamp;

/** Sorts {@link noteState.notes} in descending order by timestamp. */
export const sortStateNotes = (): Note[] => noteState.notes.sort(sortNotesFn);

/** Finds note index within {@link noteState.notes}. */
export function findNoteIndex(id?: string): number {
  return noteState.notes.findIndex((nt) => nt.id === id);
}

/** Finds note within {@link noteState.notes}. */
export function findNote(id?: string): Note | undefined {
  return noteState.notes.find((nt) => nt.id === id);
}

export function catchNoteInvokeError(err: unknown) {
  console.error('Note invoke error:');
  console.error(err);

  return dialog.message(
    'Something went wrong. Please try again or open an issue in the GitHub repo.',
    { kind: 'error' }
  );
}

/** Deletes {@link noteState.selectedNote} when note is empty. */
function clearEmptyNote(): void {
  const isValidClear = noteState.notes.length > 1;
  if (!isValidClear) return;

  const foundNote = findNote(noteState.selectedNote.id);
  if (!foundNote) return;

  if (isEmptyNote(foundNote)) {
    deleteNote(noteState.selectedNote.id);
  }
}

/**
 * Looks for note with given `id` in {@link noteState.notes},
 * and sets it to {@link noteState.selectedNote}.
 */
export function selectNote(id?: string): boolean {
  if (noteState.selectedNote.id === id) return false;

  clearEmptyNote();

  const foundNote = findNote(id);
  if (!foundNote) return false;

  noteState.selectedNote = { ...foundNote };

  document.dispatchEvent(selectNoteEvent);
  document.dispatchEvent(changeNoteEvent);

  return true;
}

/**
 * Returns true if note is either {@link noteState.selectedNote}
 * or within {@link noteState.extraSelectedNotes}.
 */
export function isSelectedNote(note: Note): boolean {
  return (
    note.id === noteState.selectedNote.id ||
    noteState.extraSelectedNotes.some((nt) => nt?.id === note.id)
  );
}

/** Fetches all notes and updates {@link noteState}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await tauriInvoke('get_all_notes').catch(catchNoteInvokeError);

  const hasNotes = fetchedNotes && fetchedNotes.length > 0;
  if (!hasNotes) return newNote();

  noteState.notes = fetchedNotes;

  sortStateNotes();

  const isSingleEmptyNote = fetchedNotes.length === 1 && isEmptyNote(fetchedNotes[0]);

  if (isSingleEmptyNote) {
    noteState.notes[0]!.timestamp = Date.now();
    // Clear these fields as whitespace-only can affect empty note checks
    noteState.notes[0]!.content.delta = {};
    noteState.notes[0]!.content.title = '';
    noteState.notes[0]!.content.body = '';
  }

  noteState.selectedNote = { ...noteState.notes[0]! };

  if (!isSingleEmptyNote) {
    clearEmptyNote();

    document.dispatchEvent(changeNoteEvent);
  }
}

/** Deletes note with the given `id`. */
export function deleteNote(id: string): void {
  noteState.notes.splice(findNoteIndex(id), 1);

  if (noteState.notes.length === 0) {
    newNote();
  } else if (noteState.selectedNote.id === id) {
    noteState.selectedNote = { ...noteState.notes[0]! };

    document.dispatchEvent(selectNoteEvent);
    document.dispatchEvent(changeNoteEvent);
  }

  if (syncState.unsyncedNoteIds.new === id) {
    syncState.unsyncedNoteIds.set({ new: '' });
  } else {
    document.dispatchEvent(getUnsyncedEvent(id, 'deleted'));

    tauriInvoke('delete_note', { id })
      .then(() => debounceSync())
      .catch(catchNoteInvokeError);
  }
}

/** Deletes {@link noteState.selectedNote} and all notes in {@link noteState.extraSelectedNotes}. */
export function deleteSelectedNotes(): void {
  deleteNote(noteState.selectedNote.id);

  noteState.extraSelectedNotes.forEach((nt) => {
    deleteNote(nt.id);
  });

  noteState.extraSelectedNotes = [];
}

/** Creates an empty note. */
export function newNote(isButtonClick?: boolean): void {
  const foundNote = findNote(noteState.selectedNote.id);

  // Only update timestamp if selected note is empty
  if (foundNote && isEmptyNote(foundNote)) {
    noteState.selectedNote.timestamp = Date.now();

    // Ensure found note isn't overwritten on sync
    if (isButtonClick) {
      syncState.unsyncedNoteIds.set({ new: foundNote.id });
    }

    return;
  }

  const freshNote = new Note();

  noteState.notes.unshift(freshNote);
  noteState.selectedNote = { ...freshNote };

  // Ensure new note isn't overwritten on sync
  if (isButtonClick) {
    syncState.unsyncedNoteIds.set({ new: freshNote.id });
  }

  document.dispatchEvent(selectNoteEvent);
  document.dispatchEvent(changeNoteEvent);
  document.dispatchEvent(newNoteEvent);

  tauriInvoke('new_note', { note: { ...freshNote } }).catch(catchNoteInvokeError);
}

/**
 * Edits currently selected note on Quill `text-change`.
 *
 * Selected note content should only be edited within `noteState.notes`, not
 * `noteState.selectedNote`, as `noteState.selectedNote` is what's reflected in the
 * editor. The timestamp, however, should be updated for both.
 */
export function editNote(delta: Partial<Delta>, title: string, body?: string): void {
  const foundNote = findNote(noteState.selectedNote.id);
  if (!foundNote || delta === foundNote.content.delta) return;

  const timestamp = Date.now();

  foundNote.timestamp = timestamp;
  noteState.selectedNote.timestamp = timestamp;

  foundNote.content = { delta, title, body: body || '' };

  sortStateNotes();

  document.dispatchEvent(getUnsyncedEvent(foundNote.id, 'edited'));

  tauriInvoke('edit_note', { note: { ...foundNote } })
    .then(() => debounceSync())
    .catch(catchNoteInvokeError);
}

/** Exports all notes, or a given selection. */
export async function exportNotes(noteIds: string[]): Promise<void> {
  const saveDir = await dialog.open({
    title: 'Choose a location',
    directory: true,
    multiple: false,
    recursive: false,
  });
  if (!saveDir) return;

  const notes = noteState.notes.filter((nt) => noteIds?.includes(nt.id));

  tauriInvoke('export_notes', { saveDir, notes }).catch(catchNoteInvokeError);
}
