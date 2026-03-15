import type Delta from 'quill-delta';

import { debounceSync } from '../../../api';
import { Note, PersistentStorage } from '../../../classes';
import { isDesktop, isEmptyNote, tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { noteState } from '../state';
import { findNote, sortStateNotes } from '../utils';

/**
 * Edits currently selected note on Quill `text-change`.
 *
 * Selected note content should only be edited within `noteState.notes`, not
 * `noteState.selectedNote`, as `noteState.selectedNote` is what's reflected in the
 * editor. The timestamp, however, should be updated for both.
 */
export function editNote(delta: Partial<Delta>, title: string, body: string): void {
  const foundNote = findNote(noteState.selectedNote.uuid);
  if (!foundNote || delta === foundNote.content.delta) return;

  const timestamp = Date.now();

  foundNote.timestamp = timestamp;
  noteState.selectedNote.timestamp = timestamp;
  foundNote.content = { delta, title, body };

  sortStateNotes();

  if (isEmptyNote(foundNote)) {
    // Check if note was previously synced to server
    if (syncState.encryptedNotesCache.has(foundNote.uuid)) {
      // Was synced, so mark as deleted to remove from server
      syncState.unsyncedNotes.set({
        deleted: [{ uuid: foundNote.uuid, deleted_at: Date.now() }],
      });
      syncState.encryptedNotesCache.delete(foundNote.uuid);
    } else {
      // Never synced, just mark as new
      syncState.unsyncedNotes.set({
        new: foundNote.uuid,
      });
    }

    // Delete from disk but keep in memory for continued editing
    if (isDesktop()) {
      tauriInvoke('delete_notes', { notes: [foundNote] }).then(() => debounceSync());

      return;
    }

    //// Web

    PersistentStorage.setJSON(
      'NOTES',
      noteState.notes.filter((nt) => !isEmptyNote(nt))
    );

    debounceSync();

    return;
  }

  // Note has content - check if it was previously marked as deleted
  const deletedIndex = syncState.unsyncedNotes.deleted.findIndex(
    (dn) => dn.uuid === foundNote.uuid
  );

  let noteToWrite = foundNote;

  if (deletedIndex > -1) {
    // Was deleted locally, give it a fresh UUID to avoid conflicts
    const newNote = new Note({
      timestamp: foundNote.timestamp,
      content: foundNote.content,
    });

    // Replace existing note
    const noteIndex = noteState.notes.indexOf(foundNote);
    noteState.notes[noteIndex] = newNote;
    noteState.selectedNote = newNote.clone();
    noteToWrite = newNote;

    // Keep old UUID in deleted array - let it sync to server
    // Update unsynced notes to track new UUID instead
    syncState.unsyncedNotes.set({
      edited: [newNote.uuid],
    });
  } else {
    syncState.unsyncedNotes.set({
      edited: [foundNote.uuid],
    });
  }

  if (isDesktop()) {
    tauriInvoke('edit_note', { note: { ...noteToWrite } }).then(() => debounceSync());

    return;
  }

  //// Web

  PersistentStorage.setJSON('NOTES', noteState.notes);
  debounceSync();
}
