import { createApp } from 'vue';
import { event } from '@tauri-apps/api';

import App from './App.vue';

event.listen('reload', () => {
  window.location.reload();
});

createApp(App).mount('#app');
