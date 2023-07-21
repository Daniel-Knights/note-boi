import { ref } from 'vue';

import { STORAGE_KEYS } from '../constant';

export const COLOUR_THEMES = ['Light', 'Dark', 'System'] as const;

type ColourTheme = (typeof COLOUR_THEMES)[number];

export const selectedTheme = ref<ColourTheme>(
  (localStorage.getItem(STORAGE_KEYS.THEME) as ColourTheme | null) || 'System'
);

export function setTheme(theme: ColourTheme): void {
  document.body.classList.remove(`theme--${selectedTheme.value.toLowerCase()}`);
  document.body.classList.add(`theme--${theme.toLowerCase()}`);

  localStorage.setItem(STORAGE_KEYS.THEME, theme);

  selectedTheme.value = theme;
}

document.body.classList.add(`theme--${selectedTheme.value.toLowerCase()}`);
