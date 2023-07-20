import { ref } from 'vue';

export enum PopupType {
  Auth,
  Error,
  Info,
}

export const openedPopup = ref<PopupType>();
