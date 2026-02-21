import * as tauriDialog from '@tauri-apps/plugin-dialog';

import { debounceSync } from '../../../api';
import { Dialog, Note } from '../../../classes';
import { UUID_REGEX } from '../../../constant';
import { isDesktop, tauriInvoke } from '../../../utils';
import { syncState } from '../../sync';
import { addNotes } from '../actions';
import { noteState } from '../state';

import { syncLocalNotes } from './syncLocalNotes';

const ACCEPTED_EXTENSIONS = ['json', 'txt'] as const;

export function importNotesToState(notes: Note[] | undefined) {
  if (!notes || notes.length === 0) return;

  // Ensure imported notes are synced and aren't overwritten if deleted remotely
  syncState.unsyncedNotes.set({ edited: notes.map((nt) => nt.uuid) });
  addNotes(notes, { selectLatest: true });
  syncLocalNotes(noteState.notes);
  debounceSync();
}

export async function importNotesFromPaths(paths: string[]): Promise<Note[] | void> {
  if (paths.length === 0) return [];

  const rawNotes = await tauriInvoke('import_notes', { paths });
  if (!rawNotes) return;

  return rawNotes.map((nt) => new Note(nt));
}

function importNotesFromFileList(fileList: FileList): Promise<Note[] | void> {
  const fileArr = Array.from(fileList);

  const fileReadPromises = fileArr.map(async (file) => {
    const content = await file.text().catch((err) => {
      throw new Error(`Failed to read file "${file.name}"`, {
        cause: err,
      });
    });

    const [fileStem = '', fileExt = ''] = file.name.split(/(\.[^\.]+$)/, 2);
    const filenameUUID = UUID_REGEX.test(fileStem) ? fileStem : undefined;
    const overrides = filenameUUID ? { uuid: filenameUUID } : undefined;

    if (fileExt === '.json') {
      try {
        return Note.fromJSONString(content, overrides);
      } catch (err) {
        throw new Error(`Failed to parse note JSON for file "${file.name}"`, {
          cause: err,
        });
      }
    }

    return Note.fromPlainString(content, overrides);
  });

  return Promise.all(fileReadPromises).catch((err) => {
    console.error(err);

    Dialog.message(err.message, {
      kind: 'error',
      title: 'Import notes',
    });
  });
}

export async function importNotesFromFileChooser() {
  if (isDesktop()) {
    const selectedFiles = await tauriDialog.open({
      multiple: true,
      filters: [
        {
          name: '',
          extensions: [...ACCEPTED_EXTENSIONS],
        },
      ],
    });
    if (!selectedFiles) return;

    const importedNotes = await importNotesFromPaths([selectedFiles].flat());
    if (!importedNotes) return;

    importNotesToState(importedNotes);

    return;
  }

  //// Web

  const inputEl = document.createElement('input');

  inputEl.type = 'file';
  inputEl.multiple = true;
  inputEl.accept = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

  inputEl.addEventListener('change', async () => {
    if (!inputEl.files) return;

    const importedNotes = await importNotesFromFileList(inputEl.files);
    if (!importedNotes) return;

    importNotesToState(importedNotes);
  });

  inputEl.click();
}

export async function handleImportNotesDragDrop(
  evType: 'enter' | 'leave' | 'drop',
  evData?: { paths: string[] } | { files: FileList }
) {
  switch (evType) {
    case 'enter':
      document.body.classList.add('dragging-file');

      break;
    case 'leave':
      document.body.classList.remove('dragging-file');

      break;
    case 'drop': {
      document.body.classList.remove('dragging-file');

      if (!evData) return;

      if (isDesktop() && 'paths' in evData) {
        const filteredNotePaths = evData.paths.filter((p) => {
          return ACCEPTED_EXTENSIONS.some((ext) => p.endsWith(`.${ext}`));
        });
        if (filteredNotePaths.length === 0) return;

        const importedNotes = await importNotesFromPaths(filteredNotePaths);
        if (!importedNotes) return;

        importNotesToState(importedNotes);

        return;
      }

      //// Web

      if (!('files' in evData)) return;

      const importedNotes = await importNotesFromFileList(evData.files);
      if (!importedNotes) return;

      importNotesToState(importedNotes);
    }
  }
}
