import * as dialog from '@tauri-apps/plugin-dialog';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exit, relaunch } from '@tauri-apps/plugin-process';
import 'quill/dist/quill.snow.css';
import { createApp } from 'vue';

import { debounceSync, deleteAccount, sync } from './api';
import { ERROR_CODE } from './classes';
import { initLogger } from './log';
import './sass/style.scss';
import {
  deleteSelectedNotes,
  exportNotes,
  getAllNotes,
  newNote,
  noteState,
} from './store/note';
import { openedPopup, POPUP_TYPE } from './store/popup';
import { syncState } from './store/sync';
import { handleUpdate } from './store/update';
import { isDev, tauriInvoke, tauriListen } from './utils';

import App from './App.vue';

createApp(App).mount('#app');
initLogger();
handleUpdate();

getAllNotes().then(() => {
  debounceSync(true);
});

WebviewWindow.getCurrent().listen('tauri://close-requested', () => {
  exitApp(async () => {
    await tauriInvoke('backup_notes', { notes: noteState.notes }).catch((err) => {
      console.error('Failed to backup notes:', err);
    });

    exit();
  });
});
tauriListen('reload', () => {
  // Relaunch acts up in dev, but is fine in production
  exitApp(isDev() ? window.location.reload.bind(window.location) : relaunch);
});
tauriListen('new-note', () => newNote(false));
tauriListen('delete-note', deleteSelectedNotes);
tauriListen('export-note', () => {
  exportNotes([
    noteState.selectedNote.id,
    ...noteState.extraSelectedNotes.map((nt) => nt.id),
  ]);
});
tauriListen('export-all-notes', () => exportNotes(noteState.notes.map((nt) => nt.id)));
tauriListen('delete-account', deleteAccount);
tauriListen('change-password', () => {
  openedPopup.value = POPUP_TYPE.CHANGE_PASSWORD;
});

export async function exitApp(cb: () => void): Promise<void> {
  if (syncState.unsyncedNotes.size > 0) {
    await sync();

    if (syncState.appError.code === ERROR_CODE.SYNC) {
      const closeAnyway = await dialog.ask(
        'ERROR: Failed to sync notes.\nClose anyway?',
        {
          title: 'NoteBoi',
          kind: 'error',
        }
      );

      if (closeAnyway) cb();
      else openedPopup.value = POPUP_TYPE.ERROR;

      return;
    }
  }

  cb();
}
