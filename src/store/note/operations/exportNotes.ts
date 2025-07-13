import * as dialog from '@tauri-apps/plugin-dialog';

import { tauriInvoke } from '../../../utils';
import { noteState } from '../state';

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

  tauriInvoke('export_notes', { saveDir, notes });
}
