import { Event } from '@tauri-apps/api/event';
import { DragDropEvent } from '@tauri-apps/api/webview';
import { open } from '@tauri-apps/plugin-dialog';

import { tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { noteState } from '../state';

export async function importNotes(paths: string[]) {
  const importedNotes = await tauriInvoke('import_notes', { paths }).catch((errors) => {
    console.error(...errors);
  });
  if (!importedNotes) return;

  // Ensure imported notes are synced and aren't overwritten if deleted remotely
  syncState.unsyncedNotes.set({ edited: importedNotes.map((nt) => nt.uuid) });
  noteState.addNotes(importedNotes, true);
}

export async function importNotesFromFileChooser() {
  const selectedFiles = await open({
    multiple: true,
    filters: [
      {
        name: 'notes-json',
        extensions: ['json'],
      },
    ],
  });
  if (!selectedFiles) return;

  await importNotes(Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles]);
}

export function handleImportNotesDragDrop(ev: Event<DragDropEvent>) {
  switch (ev.payload.type) {
    case 'enter':
      document.body.classList.add('dragging-file');

      break;
    case 'leave':
      document.body.classList.remove('dragging-file');

      break;
    case 'drop':
      document.body.classList.remove('dragging-file');
      importNotes(ev.payload.paths);
  }
}
