import * as tauriDialog from '@tauri-apps/plugin-dialog';
import { AsyncZippable, strToU8, zip } from 'fflate';

import { isDesktop, tauriInvoke } from '../../../utils';
import { noteState } from '../state';

/** Exports all notes, or a given selection. */
export async function exportNotes(noteUuids: string[]): Promise<void> {
  const notes = noteState.notes.filter((nt) => noteUuids.includes(nt.uuid));

  if (isDesktop()) {
    const saveDir = await tauriDialog.open({
      title: 'Choose a location',
      directory: true,
      multiple: false,
      recursive: false,
    });
    if (!saveDir || typeof saveDir !== 'string') return;

    tauriInvoke('export_notes', { saveDir: saveDir ?? '', notes });

    return;
  }

  //// Web

  const folderName = `note-boi-notes-${Date.now()}`;
  const zippableNotes = notes.reduce((acc, nt) => {
    acc[`${folderName}/${nt.uuid}.txt`] = strToU8(nt.getText());

    return acc;
  }, {} as AsyncZippable);

  return new Promise((res, rej) => {
    zip(zippableNotes, (err, data) => {
      if (err) rej(err);

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
