import { Note, Storage } from '../../../classes';
import { isDesktop, isEmptyNote, tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { changeNoteEvent, newNoteEvent, selectNoteEvent } from '../event';
import { noteState } from '../state';
import { findNote } from '../utils';

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
  noteState.selectedNote = freshNote.clone();

  // Ensure new note isn't overwritten on sync
  if (isButtonClick) {
    syncState.unsyncedNotes.set({ new: freshNote.uuid });
  }

  document.dispatchEvent(selectNoteEvent);
  document.dispatchEvent(changeNoteEvent);
  document.dispatchEvent(newNoteEvent);

  if (isDesktop()) {
    tauriInvoke('new_note', { note: { ...freshNote } });

    return;
  }

  //// Web

  Storage.setJSON('NOTES', noteState.notes);
}
