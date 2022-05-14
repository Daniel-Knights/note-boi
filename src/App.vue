<template>
  <NoteMenu />
  <Editor />
  <Logout />
  <SyncStatus @popup-auth="handlePopupAuthEvent" @popup-error="popup.error = true" />
  <SyncAuth v-if="popup.auth" @close="closeSyncPopup('auth')" />
  <SyncError v-if="popup.error" @close="closeSyncPopup('error')" />
</template>

<script lang="ts" setup>
import { reactive } from 'vue';
import { window as tauriWindow } from '@tauri-apps/api';

import { getAllNotes, newNote, deleteAllNotes } from './store/note';
import { push, resetError, state } from './store/sync';
import { tauriListen } from './utils';

import NoteMenu from './components/NoteMenu.vue';
import Editor from './components/Editor.vue';
import SyncStatus from './components/SyncStatus.vue';
import SyncAuth from './components/SyncAuth.vue';
import SyncError from './components/SyncError.vue';
import Logout from './components/Logout.vue';

getAllNotes();

const popup = reactive({
  auth: false,
  error: false,
});

function handlePopupAuthEvent() {
  // Prevent bug where event.emit triggers event.listen
  if (!state.token) {
    popup.auth = true;
  }
}

function closeSyncPopup(field: keyof typeof popup) {
  popup[field] = false;
  resetError();
}

async function exitApp(cb: () => void) {
  if (state.unsyncedNoteIds.size > 0) {
    await push();
  }

  cb();
}

tauriWindow.appWindow.listen('tauri://close-requested', () => {
  exitApp(() => tauriWindow.appWindow.close());
});
tauriListen('reload', () => {
  exitApp(() => window.location.reload());
});
tauriListen('new-note', () => newNote(false));
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
  color: var(--colour__secondary);
  background-color: var(--colour__primary);
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

#app {
  display: flex;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu,
    Cantarell, 'Helvetica Neue', sans-serif;
}
</style>
