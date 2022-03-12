import { createApp } from 'vue';
import { event } from '@tauri-apps/api';

import { newNote, deleteAllNotes } from './store/note';
import App from './App.vue';

event.listen('reload', () => {
  window.location.reload();
});
event.listen('new-note', () => {
  newNote();
});
event.listen('delete-note', deleteAllNotes);

createApp(App).mount('#app');
