<template>
  <Loading v-if="updateDownloading" />
  <NoteMenu />
  <Editor />
  <UtilityMenu />
  <SyncStatus />
</template>

<script lang="ts" setup>
import { window as tauriWindow } from '@tauri-apps/api';
import { exit, relaunch } from '@tauri-apps/api/process';

import { deleteAllNotes, getAllNotes, newNote } from './store/note';
import { openedPopup, PopupType } from './store/popup';
import { ErrorType, push, state } from './store/sync';
import { handleUpdate, updateDownloading } from './store/update';
import { tauriListen } from './utils';

import Editor from './components/Editor.vue';
import Loading from './components/Loading.vue';
import NoteMenu from './components/NoteMenu.vue';
import SyncStatus from './components/SyncStatus.vue';
import UtilityMenu from './components/UtilityMenu.vue';

getAllNotes();

async function exitApp(cb: () => void) {
  if (state.unsyncedNoteIds.size > 0) {
    await push();

    if (state.error.type === ErrorType.Push) {
      openedPopup.value = PopupType.Error;
      return;
    }
  }

  cb();
}

tauriWindow.appWindow.listen('tauri://close-requested', () => exitApp(exit));
tauriListen('reload', () => exitApp(relaunch));
tauriListen('new-note', () => newNote(false));
tauriListen('delete-note', deleteAllNotes);

handleUpdate();
</script>

<style lang="scss">
@use 'quill/dist/quill.snow.css';

@use './sass/reset';

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

button,
input[type='submit'] {
  -webkit-appearance: none;
  cursor: pointer;
  border: 0;
  border-radius: 0;

  &.button--default {
    padding: 5px 20px;
    line-height: 1;
    color: #fff;
    background-color: var(--colour__interactive);
    text-shadow: v.$text-shadow;
  }

  &:hover {
    opacity: 0.8;
  }
}

input:not([type='submit']),
textarea {
  -webkit-appearance: none;
  padding: 5px;
  border: 1px solid var(--colour__primary);
  border-radius: 0;
}

a {
  color: rgb(47, 175, 122);

  &:hover {
    text-decoration: none;
    color: rgb(74, 196, 145);
  }
}
</style>
