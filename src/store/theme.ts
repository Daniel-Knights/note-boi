import { ref } from 'vue';

import { ColourTheme } from '../constant';
import { storage } from '../storage';

export const selectedTheme = ref(storage.get('THEME') || 'System');

export function setTheme(theme: ColourTheme): void {
  document.body.classList.remove(`theme--${selectedTheme.value.toLowerCase()}`);
  document.body.classList.add(`theme--${theme.toLowerCase()}`);

  storage.set('THEME', theme);

  selectedTheme.value = theme;
}

document.body.classList.add(`theme--${selectedTheme.value.toLowerCase()}`);
