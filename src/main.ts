import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exit, relaunch } from '@tauri-apps/plugin-process';
import 'quill/dist/quill.snow.css';
import { createApp } from 'vue';

import { deleteAccount, queueSync } from './api';
import { initLogger } from './log';
import './sass/style.scss';
import {
  backupNotes,
  deleteSelectedNotes,
  exportNotes,
  getAllNotes,
  handleImportNotesDragDrop,
  importNotesFromFileChooser,
  newNote,
  noteState,
} from './store/note';
import { openedPopup, POPUP_TYPE } from './store/popup';
import { syncState } from './store/sync';
import { handleUpdate } from './store/update';
import { isDesktop, isDev, tauriListen } from './utils';

import App from './App.vue';

createApp(App).mount('#app');

if (isDesktop()) {
  initDesktop();
} else {
  initWeb();
}

//// Desktop

function initDesktop() {
  initLogger();
  handleUpdate();
  getAllNotes().then(() => {
    if (!syncState.username) return;

    queueSync();
  });

  const webview = WebviewWindow.getCurrent();

  //// Register event handlers

  webview.onCloseRequested(async () => {
    await backupNotes(noteState.notes);
    exit();
  });

  webview.onDragDropEvent((ev) => {
    if (ev.payload.type === 'over') return;

    const evData = 'paths' in ev.payload ? { paths: ev.payload.paths } : undefined;

    handleImportNotesDragDrop(ev.payload.type, evData);
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
  tauriListen('export-all-notes', () =>
    exportNotes(noteState.notes.map((nt) => nt.uuid))
  );
  tauriListen('delete-account', deleteAccount);
  tauriListen('change-password', () => {
    openedPopup.value = POPUP_TYPE.CHANGE_PASSWORD;
  });
}

//// Web

function initWeb() {
  // Initialise PWA
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration) {
      registration.update();
    } else {
      navigator.serviceWorker.register('sw.js');
    }
  });

  getAllNotes().then(() => {
    if (!syncState.username) return;

    queueSync();
  });

  //// Register event handlers

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;

    backupNotes(noteState.notes);
  });

  // NOTE: The drag and drop API is whack
  document.body.addEventListener('drop', (ev) => {
    if (!ev.dataTransfer) return;

    ev.preventDefault(); // Prevent opening separate tabs for each dropped file
    handleImportNotesDragDrop('drop', { files: ev.dataTransfer.files });
  });
  document.body.addEventListener('dragenter', () => {
    handleImportNotesDragDrop('enter');
  });
  document.body.addEventListener('dragover', (ev) => {
    ev.preventDefault(); // `drop` won't fire unless we prevent here
  });
  document.body.addEventListener('dragleave', (ev) => {
    // `dragleave` fires for all child elements too, so we need to check
    // if it has left the window boundaries explicitly
    if (
      ev.clientY > 0 &&
      ev.clientY < window.innerHeight &&
      ev.clientX > 0 &&
      ev.clientX < window.innerWidth
    ) {
      return;
    }

    handleImportNotesDragDrop('leave');
  });
}
