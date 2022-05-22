import { ref } from 'vue';

import { STORAGE_KEYS } from '../constant';

export const colourThemes = ['Light', 'Dark', 'System'] as const;
export const selectedTheme = ref(localStorage.getItem(STORAGE_KEYS.THEME) || 'System');

export function setTheme(theme: typeof colourThemes[number]): void {
  document.body.classList.remove(`theme--${selectedTheme.value.toLowerCase()}`);
  document.body.classList.add(`theme--${theme.toLowerCase()}`);

  localStorage.setItem(STORAGE_KEYS.THEME, theme);

  selectedTheme.value = theme;
}

document.body.classList.add(`theme--${selectedTheme.value.toLowerCase()}`);
