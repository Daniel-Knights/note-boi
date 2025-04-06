import { ref } from 'vue';

export const POPUP_TYPE = {
  AUTH: 'auth',
  ERROR: 'error',
  INFO: 'info',
  CHANGE_PASSWORD: 'change-password',
} as const;

export type PopupType = (typeof POPUP_TYPE)[keyof typeof POPUP_TYPE];

export const openedPopup = ref<PopupType>();
