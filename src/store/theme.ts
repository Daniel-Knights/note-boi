import { ref } from 'vue';

import { Storage } from '../classes';
import { ColourTheme } from '../constant';

export const selectedTheme = ref(Storage.get('THEME') || 'System');

export function setTheme(theme: ColourTheme): void {
  document.body.classList.remove(`theme--${selectedTheme.value.toLowerCase()}`);
  document.body.classList.add(`theme--${theme.toLowerCase()}`);

  Storage.set('THEME', theme);

  selectedTheme.value = theme;
}

document.body.classList.add(`theme--${selectedTheme.value.toLowerCase()}`);
