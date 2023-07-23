import { dialog, window as tauriWindow } from '@tauri-apps/api';
import { exit, relaunch } from '@tauri-apps/api/process';
import 'quill/dist/quill.snow.css';
import { createApp } from 'vue';

import './sass/_button.scss';
import './sass/_form.scss';
import './sass/_reset.scss';
import './sass/_theme.scss';
import { deleteAllNotes, getAllNotes, newNote } from './store/note';
import { openedPopup, PopupType } from './store/popup';
import { ErrorType, push, syncState } from './store/sync';
import { handleUpdate } from './store/update';
import { tauriListen } from './utils';

import App from './App.vue';

createApp(App).mount('#app');

export async function exitApp(cb: () => void): Promise<void> {
  if (syncState.unsyncedNoteIds.size > 0) {
    await push();

    if (syncState.error.type === ErrorType.Push) {
      const closeAnyway = await dialog.ask(
        'ERROR: Failed to push unsynced notes.\nClose anyway?',
        {
          title: 'NoteBoi',
          type: 'error',
        }
      );

      if (closeAnyway) cb();
      else openedPopup.value = PopupType.Error;

      return;
    }
  }

  cb();
}

getAllNotes();
handleUpdate();

tauriWindow.appWindow.listen('tauri://close-requested', () => {
  exitApp(exit);
});
tauriListen('reload', () => exitApp(relaunch));
tauriListen('new-note', () => newNote(false));
tauriListen('delete-note', deleteAllNotes);
