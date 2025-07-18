import { Event as TauriEvent } from '@tauri-apps/api/event';
import { DragDropEvent } from '@tauri-apps/api/webview';
import { open } from '@tauri-apps/plugin-dialog';

import { debounceSync } from '../../../api';
import { tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { noteState } from '../state';

const ACCEPTED_EXTENSIONS = ['json', 'txt'] as const;

export async function importNotes(paths: string[]) {
  if (paths.length === 0) return;

  const importedNotes = await tauriInvoke('import_notes', { paths });
  if (!importedNotes) return;

  // Ensure imported notes are synced and aren't overwritten if deleted remotely
  syncState.unsyncedNotes.set({ edited: importedNotes.map((nt) => nt.uuid) });
  noteState.addNotes(importedNotes, true);
  debounceSync();
}

export async function importNotesFromFileChooser() {
  const selectedFiles = await open({
    multiple: true,
    filters: [
      {
        name: 'notes-json',
        extensions: [...ACCEPTED_EXTENSIONS],
      },
    ],
  });
  if (!selectedFiles) return;

  await importNotes(Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles]);
}

export function handleImportNotesDragDrop(ev: TauriEvent<DragDropEvent>) {
  switch (ev.payload.type) {
    case 'enter':
      document.body.classList.add('dragging-file');

      break;
    case 'leave':
      document.body.classList.remove('dragging-file');

      break;
    case 'drop': {
      document.body.classList.remove('dragging-file');

      const filteredNotes = ev.payload.paths.filter((p) => {
        return ACCEPTED_EXTENSIONS.some((ext) => p.endsWith(`.${ext}`));
      });
      if (filteredNotes.length === 0) return;

      importNotes(filteredNotes);
    }
  }
}
