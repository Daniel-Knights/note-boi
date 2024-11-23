import * as dialog from '@tauri-apps/plugin-dialog';
import { webview } from '@tauri-apps/api';
import { exit, relaunch } from '@tauri-apps/plugin-process';
import 'quill/dist/quill.snow.css';
import { createApp } from 'vue';

import { initLogger } from './log';
import './sass/_button.scss';
import './sass/_form.scss';
import './sass/_reset.scss';
import './sass/_theme.scss';
import {
  deleteSelectedNotes,
  exportNotes,
  getAllNotes,
  newNote,
  noteState,
} from './store/note';
import { openedPopup, PopupType } from './store/popup';
import { deleteAccount, ErrorKind, push, syncState } from './store/sync';
import { handleUpdate } from './store/update';
import { isDev, tauriListen } from './utils';

import App from './App.vue';

createApp(App).mount('#app');
initLogger();
getAllNotes();
handleUpdate();

webview.getCurrentWebview().listen('tauri://close-requested', () => {
  exitApp(exit);
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
  openedPopup.value = PopupType.ChangePassword;
});

export async function exitApp(cb: () => void): Promise<void> {
  if (syncState.unsyncedNoteIds.size > 0) {
    await push();

    if (syncState.error.kind === ErrorKind.Push) {
      const closeAnyway = await dialog.ask(
        'ERROR: Failed to push unsynced notes.\nClose anyway?',
        {
          title: 'NoteBoi',
          kind: 'error',
        }
      );

      if (closeAnyway) cb();
      else openedPopup.value = PopupType.Error;

      return;
    }
  }

  cb();
}
