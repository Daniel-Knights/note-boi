<template>
  <NoteMenu />
  <Editor />
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
import { window as tauriWindow, dialog, event } from '@tauri-apps/api';

import { getAllNotes, newNote, deleteAllNotes } from './store/note';
import { resetError, state, push } from './store/sync';

import NoteMenu from './components/NoteMenu.vue';
import Editor from './components/Editor.vue';
import SyncStatus from './components/SyncStatus.vue';
import SyncAuth from './components/SyncAuth.vue';
import SyncError from './components/SyncError.vue';

const popup = reactive({
  auth: false,
  error: false,
});

getAllNotes();

tauriWindow.appWindow.listen('tauri://close-requested', () => {
  if (!state.token || !state.hasUnsyncedNotes) {
    tauriWindow.appWindow.close();
  }

  dialog.ask('Sync changes before leaving?').then(async (shouldSync) => {
    if (shouldSync) await push();

    tauriWindow.appWindow.close();
  });
});
event.listen('reload', () => {
  window.location.reload();
});
event.listen('new-note', () => {
  newNote();
});
event.listen('delete-note', deleteAllNotes);
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

button {
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
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
