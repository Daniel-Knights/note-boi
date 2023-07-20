<template>
  <Loading v-if="updateDownloading" />
  <NoteMenu />
  <Editor />
  <UtilityMenu />
  <SyncStatus />
</template>

<script lang="ts" setup>
import { dialog, window as tauriWindow } from '@tauri-apps/api';
import { exit, relaunch } from '@tauri-apps/api/process';

import { deleteAllNotes, getAllNotes, newNote } from './store/note';
import { openedPopup, PopupType } from './store/popup';
import { ErrorType, push, syncState } from './store/sync';
import { handleUpdate, updateDownloading } from './store/update';
import { tauriListen } from './utils';

import Editor from './components/Editor.vue';
import Loading from './components/Loading.vue';
import NoteMenu from './components/NoteMenu.vue';
import SyncStatus from './components/SyncStatus.vue';
import UtilityMenu from './components/UtilityMenu.vue';

async function exitApp(cb: () => void) {
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

tauriWindow.appWindow.listen('tauri://close-requested', () => exitApp(exit));
tauriListen('reload', () => exitApp(relaunch));
tauriListen('new-note', () => newNote(false));
tauriListen('delete-note', deleteAllNotes);
</script>

<style lang="scss">
@use 'quill/dist/quill.snow.css';

@use './sass/reset';
@use './sass/form';
@use './sass/theme';
@use './sass/button';

html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  margin: 0;
  color: var(--colour__secondary);
  background-color: var(--colour__primary);
}

#app {
  display: flex;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu,
    Cantarell, 'Helvetica Neue', sans-serif;
}

a {
  color: rgb(47, 175, 122);

  &:hover {
    text-decoration: none;
    color: rgb(74, 196, 145);
  }
}
</style>
