<template>
  <NoteMenu />
  <Editor />
  <Logout />
  <SyncStatus @popup-auth="popup.auth = true" @popup-error="popup.error = true" />
  <SyncAuth
    v-if="popup.auth"
    @close="
      popup.auth = false;
      resetError();
    "
  />
  <SyncError v-if="popup.error" @close="popup.error = false" />
</template>

<script lang="ts" setup>
import { reactive } from 'vue';
import { window as tauriWindow, dialog } from '@tauri-apps/api';

import { getAllNotes, newNote, deleteAllNotes } from './store/note';
import { resetError, state, push } from './store/sync';
import { tauriListen } from './utils';

import NoteMenu from './components/NoteMenu.vue';
import Editor from './components/Editor.vue';
import SyncStatus from './components/SyncStatus.vue';
import SyncAuth from './components/SyncAuth.vue';
import SyncError from './components/SyncError.vue';
import Logout from './components/Logout.vue';

const popup = reactive({
  auth: false,
  error: false,
});

getAllNotes();

function confirmDialog(cb: () => void) {
  if (!state.token || !state.hasUnsyncedNotes) {
    cb();
    return;
  }

  dialog.ask('Sync changes before leaving?').then(async (shouldSync) => {
    if (shouldSync) await push();

    cb();
  });
}

tauriWindow.appWindow.listen('tauri://close-requested', () => {
  confirmDialog(() => tauriWindow.appWindow.close());
});
tauriListen('reload', () => {
  confirmDialog(() => window.location.reload());
});
tauriListen('new-note', () => {
  newNote();
});
tauriListen('delete-note', deleteAllNotes);
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
  color: var(--color__secondary);
  background-color: var(--color__primary);
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
    background-color: var(--color__interactive);
  }

  &:hover {
    opacity: 0.8;
  }
}

input:not([type='submit']),
textarea {
  -webkit-appearance: none;
  padding: 5px;
  border: 1px solid var(--color__primary);
  border-radius: 0;
}

#app {
  display: grid;
  grid-template-columns: minmax(260px, 25%) auto;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu,
    Cantarell, 'Helvetica Neue', sans-serif;
}
</style>
