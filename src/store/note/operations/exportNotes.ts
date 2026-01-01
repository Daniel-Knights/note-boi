import * as tauriDialog from '@tauri-apps/plugin-dialog';
import { AsyncZippable, strToU8, zip } from 'fflate';

import { Dialog } from '../../../classes';
import { isDesktop, tauriInvoke } from '../../../utils';
import { noteState } from '../state';

/** Exports all notes, or a given selection. */
export async function exportNotes(noteUuids: string[]): Promise<void> {
  const notes = noteState.notes.filter((nt) => noteUuids.includes(nt.uuid));

  if (isDesktop()) {
    const saveDir = await tauriDialog
      .open({
        title: 'Choose a location',
        directory: true,
        multiple: false,
        recursive: false,
      })
      .catch(async (err) => {
        // ENH: abstract this error-handling pattern to separate helper or class
        console.error('Failed to open directory:');
        console.error(err);

        const tryAgain = await Dialog.ask('Failed to open directory. Try again?', {
          title: 'Export notes',
          kind: 'error',
        });
        if (!tryAgain) return;

        return exportNotes(noteUuids);
      });
    if (!saveDir) return;

    tauriInvoke('export_notes', { saveDir: saveDir ?? '', notes });

    return;
  }

  //// Web

  const folderName = `note-boi-notes-${Date.now()}`;
  const zippableNotes = notes.reduce((acc, nt) => {
    acc[`${folderName}/${nt.uuid}.txt`] = strToU8(nt.getText());

    return acc;
  }, {} as AsyncZippable);

  return new Promise((res) => {
    zip(zippableNotes, async (err, data) => {
      if (err) {
        console.error('Failed to zip notes:');
        console.error(err);

        const tryAgain = await Dialog.ask('Failed to zip notes. Try again?', {
          title: 'Export notes',
          kind: 'error',
        });
        if (!tryAgain) return;

        return exportNotes(noteUuids);
      }

      const blob = new Blob([new Uint8Array(data)], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${folderName}.zip`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      res();
    });
  });
}
