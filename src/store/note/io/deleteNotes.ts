import { debounceSync, DeletedNote } from '../../../api';
import { PersistentStorage, RawNote } from '../../../classes';
import { isDesktop, tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { dispatchNoteEvent } from '../event';
import { noteState } from '../state';
import { findNoteIndex } from '../utils';

import { newNote } from './newNote';

/** Deletes given notes. */
export function deleteNotes(notes: RawNote[]): void {
  const deletedNotes: DeletedNote[] = [];

  let includesSelectedNote = false;
  let includesNewNote = false;

  notes.forEach((nt) => {
    const deletedNote = {
      uuid: nt.uuid,
      content: nt.content,
      deleted_at: Date.now(),
      deleted_permanently: false,
    };

    noteState.notes.splice(findNoteIndex(nt.uuid), 1);
    deletedNotes.push(deletedNote);

    includesSelectedNote ||= nt.uuid === noteState.selectedNote.uuid;
    includesNewNote ||= nt.uuid === syncState.unsyncedNotes.new;
  });

  if (noteState.notes.length === 0) {
    newNote();
  } else if (includesSelectedNote) {
    noteState.selectedNote = { ...noteState.notes[0]! };

    dispatchNoteEvent('note-select');
    dispatchNoteEvent('note-change');
  }

  if (includesNewNote) {
    syncState.unsyncedNotes.set({ new: '' });

    return;
  }

  syncState.unsyncedNotes.set({ deleted: deletedNotes });

  if (isDesktop()) {
    tauriInvoke('delete_notes', { notes }).then(() => debounceSync());

    return;
  }

  //// Web

  PersistentStorage.setJSON('NOTES', noteState.notes);
  debounceSync();
}

/** Deletes {@link noteState.selectedNote} and all notes in {@link noteState.extraSelectedNotes}. */
export function deleteSelectedNotes(): void {
  deleteNotes([noteState.selectedNote, ...noteState.extraSelectedNotes]);

  noteState.extraSelectedNotes = [];
}
