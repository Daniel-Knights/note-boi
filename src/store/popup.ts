import { ref } from 'vue';

export enum PopupType {
  Auth,
  Error,
  Info,
  DeleteAccount,
}

export const openedPopup = ref<PopupType>();
