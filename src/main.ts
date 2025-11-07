import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exit, relaunch } from '@tauri-apps/plugin-process';
import 'quill/dist/quill.snow.css';
import { createApp } from 'vue';

import { deleteAccount, queueSync } from './api';
import { initLogger } from './log';
import './sass/style.scss';
import {
  deleteSelectedNotes,
  exportNotes,
  getAllNotes,
  handleImportNotesDragDrop,
  importNotesFromFileChooser,
  newNote,
  noteState,
} from './store/note';
import { openedPopup, POPUP_TYPE } from './store/popup';
import { handleUpdate } from './store/update';
import { isDev, tauriInvoke, tauriListen } from './utils';

import App from './App.vue';

const webview = WebviewWindow.getCurrent();

createApp(App).mount('#app');
initLogger();
handleUpdate();

getAllNotes().then(() => {
  queueSync();
});

webview.onCloseRequested(async () => {
  await tauriInvoke('backup_notes', { notes: noteState.notes }).catch((err) => {
    console.error('Failed to backup notes:', err);
  });

  exit();
});

webview.onDragDropEvent((ev) => {
  handleImportNotesDragDrop(ev);
});

tauriListen('reload', () => {
  // Relaunch acts up in dev, but is fine in production
  if (isDev()) {
    window.location.reload();
  } else {
    relaunch();
  }
});

tauriListen('new-note', () => newNote(true));
tauriListen('delete-note', deleteSelectedNotes);
tauriListen('import-notes', () => {
  importNotesFromFileChooser();
});
tauriListen('export-note', () => {
  exportNotes([
    noteState.selectedNote.uuid,
    ...noteState.extraSelectedNotes.map((nt) => nt.uuid),
  ]);
});
tauriListen('export-all-notes', () => exportNotes(noteState.notes.map((nt) => nt.uuid)));
tauriListen('delete-account', deleteAccount);
tauriListen('change-password', () => {
  openedPopup.value = POPUP_TYPE.CHANGE_PASSWORD;
});
