import type Delta from 'quill-delta';

import { debounceSync } from '../../../api';
import { tauriInvoke } from '../../../utils';
import { getUnsyncedEvent } from '../event';
import { noteState } from '../state';
import { findNote, sortStateNotes } from '../utils';

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

  tauriInvoke('edit_note', { note: { ...foundNote } }).then(() => debounceSync());
}
