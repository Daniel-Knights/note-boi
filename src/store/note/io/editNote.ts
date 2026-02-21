import type Delta from 'quill-delta';

import { debounceSync } from '../../../api';
import { Storage } from '../../../classes';
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
    // Ensure note isn't overwritten on sync after deleting all content
    syncState.unsyncedNotes.set({
      new: foundNote.uuid,
    });
  } else {
    syncState.unsyncedNotes.set({
      edited: [foundNote.uuid],
    });
  }

  if (isDesktop()) {
    tauriInvoke('edit_note', { note: { ...foundNote } }).then(() => debounceSync());

    return;
  }

  //// Web

  Storage.setJSON('NOTES', noteState.notes);
  debounceSync();
}
