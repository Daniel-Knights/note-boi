import { ref } from 'vue';

export enum PopupType {
  Auth,
  Error,
  Info,
  ChangePassword,
}

export const openedPopup = ref<PopupType>();
