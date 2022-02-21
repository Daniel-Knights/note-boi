import { createApp } from 'vue';
import { event } from '@tauri-apps/api';

import { newNote, deleteNote, state } from './store';
import App from './App.vue';

event.listen('reload', () => {
  window.location.reload();
});
event.listen('new-note', () => {
  newNote();
});
event.listen('delete-note', () => {
  deleteNote(state.selectedNote.id);
});

createApp(App).mount('#app');
