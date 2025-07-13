import { isEmptyNote, tauriInvoke } from '../../../utils';
import { changeNoteEvent } from '../event';
import { noteState } from '../state';
import { clearEmptyNote, sortStateNotes } from '../utils';

import { newNote } from './newNote';

/** Fetches all notes and updates {@link noteState}. */
export async function getAllNotes(): Promise<void> {
  const fetchedNotes = await tauriInvoke('get_all_notes');
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
