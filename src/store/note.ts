import * as dialog from '@tauri-apps/plugin-dialog';
import type Delta from 'quill-delta';
import { reactive } from 'vue';

import { debounceSync, DeletedNote } from '../api';
import { NOTE_EVENTS } from '../constant';
import { isEmptyNote, tauriInvoke } from '../utils';

import { syncState } from './sync';

export type UnsyncedEventDetail =
  | {
      note: string;
      kind: 'edited';
    }
  | {
      note: DeletedNote;
      kind: 'deleted';
    };

export class Note {
  readonly uuid: string = crypto.randomUUID();
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

function getUnsyncedEvent(detail: UnsyncedEventDetail) {
  return new CustomEvent(NOTE_EVENTS.unsynced, { detail });
}

/** Sorts notes in descending order by timestamp. */
export const sortNotesFn = (a: Note, b: Note): number => b.timestamp - a.timestamp;

/** Sorts {@link noteState.notes} in descending order by timestamp. */
export const sortStateNotes = (): Note[] => noteState.notes.sort(sortNotesFn);

/** Finds note index within {@link noteState.notes}. */
export function findNoteIndex(uuid?: string): number {
  return noteState.notes.findIndex((nt) => nt.uuid === uuid);
}

/** Finds note within {@link noteState.notes}. */
export function findNote(uuid?: string): Note | undefined {
  return noteState.notes.find((nt) => nt.uuid === uuid);
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

  const foundNote = findNote(noteState.selectedNote.uuid);
  if (!foundNote) return;

  if (isEmptyNote(foundNote)) {
    deleteNote(noteState.selectedNote.uuid);
  }
}

/**
 * Looks for note with given `uuid` in {@link noteState.notes},
 * and sets it to {@link noteState.selectedNote}.
 */
export function selectNote(uuid?: string): boolean {
  if (noteState.selectedNote.uuid === uuid) return false;

  clearEmptyNote();

  const foundNote = findNote(uuid);
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
    note.uuid === noteState.selectedNote.uuid ||
    noteState.extraSelectedNotes.some((nt) => nt?.uuid === note.uuid)
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

/** Deletes note with the given `uuid`. */
export function deleteNote(uuid: string): void {
  noteState.notes.splice(findNoteIndex(uuid), 1);

  if (noteState.notes.length === 0) {
    newNote();
  } else if (noteState.selectedNote.uuid === uuid) {
    noteState.selectedNote = { ...noteState.notes[0]! };

    document.dispatchEvent(selectNoteEvent);
    document.dispatchEvent(changeNoteEvent);
  }

  if (syncState.unsyncedNotes.new === uuid) {
    syncState.unsyncedNotes.set({ new: '' });
  } else {
    document.dispatchEvent(
      getUnsyncedEvent({
        kind: 'deleted',
        note: { uuid, deleted_at: Date.now() },
      })
    );

    tauriInvoke('delete_note', { uuid })
      .then(() => debounceSync())
      .catch(catchNoteInvokeError);
  }
}

/** Deletes {@link noteState.selectedNote} and all notes in {@link noteState.extraSelectedNotes}. */
export function deleteSelectedNotes(): void {
  deleteNote(noteState.selectedNote.uuid);

  noteState.extraSelectedNotes.forEach((nt) => {
    deleteNote(nt.uuid);
  });

  noteState.extraSelectedNotes = [];
}

/** Creates an empty note. */
export function newNote(isButtonClick?: boolean): void {
  const foundNote = findNote(noteState.selectedNote.uuid);

  // Only update timestamp if selected note is empty
  if (foundNote && isEmptyNote(foundNote)) {
    noteState.selectedNote.timestamp = Date.now();

    // Ensure found note isn't overwritten on sync
    if (isButtonClick) {
      syncState.unsyncedNotes.set({ new: foundNote.uuid });
    }

    return;
  }

  const freshNote = new Note();

  noteState.notes.unshift(freshNote);
  noteState.selectedNote = { ...freshNote };

  // Ensure new note isn't overwritten on sync
  if (isButtonClick) {
    syncState.unsyncedNotes.set({ new: freshNote.uuid });
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
  const foundNote = findNote(noteState.selectedNote.uuid);
  if (!foundNote || delta === foundNote.content.delta) return;

  const timestamp = Date.now();

  foundNote.timestamp = timestamp;
  noteState.selectedNote.timestamp = timestamp;

  foundNote.content = { delta, title, body: body || '' };

  sortStateNotes();

  document.dispatchEvent(
    getUnsyncedEvent({
      kind: 'edited',
      note: foundNote.uuid,
    })
  );

  tauriInvoke('edit_note', { note: { ...foundNote } })
    .then(() => debounceSync())
    .catch(catchNoteInvokeError);
}

/** Exports all notes, or a given selection. */
export async function exportNotes(noteUuids: string[]): Promise<void> {
  const saveDir = await dialog.open({
    title: 'Choose a location',
    directory: true,
    multiple: false,
    recursive: false,
  });
  if (!saveDir) return;

  const notes = noteState.notes.filter((nt) => noteUuids?.includes(nt.uuid));

  tauriInvoke('export_notes', { saveDir, notes }).catch(catchNoteInvokeError);
}
