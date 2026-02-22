import { debounceSync } from '../../../api';
import { PersistentStorage } from '../../../classes';
import { isDesktop, tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { dispatchNoteEvent } from '../event';
import { noteState } from '../state';
import { findNoteIndex } from '../utils';

import { newNote } from './newNote';

/** Deletes note with the given `uuid`. */
export function deleteNote(uuid: string): void {
  noteState.notes.splice(findNoteIndex(uuid), 1);

  if (noteState.notes.length === 0) {
    newNote();
  } else if (noteState.selectedNote.uuid === uuid) {
    noteState.selectedNote = { ...noteState.notes[0]! };

    dispatchNoteEvent('note-select');
    dispatchNoteEvent('note-change');
  }

  if (syncState.unsyncedNotes.new === uuid) {
    syncState.unsyncedNotes.set({ new: '' });

    return;
  }

  syncState.unsyncedNotes.set({
    deleted: [{ uuid, deleted_at: Date.now() }],
  });

  if (isDesktop()) {
    tauriInvoke('delete_note', { uuid }).then(() => debounceSync());

    return;
  }

  //// Web

  PersistentStorage.setJSON('NOTES', noteState.notes);
  debounceSync();
}

/** Deletes {@link noteState.selectedNote} and all notes in {@link noteState.extraSelectedNotes}. */
export function deleteSelectedNotes(): void {
  deleteNote(noteState.selectedNote.uuid);

  noteState.extraSelectedNotes.forEach((nt) => {
    deleteNote(nt.uuid);
  });

  noteState.extraSelectedNotes = [];
}
