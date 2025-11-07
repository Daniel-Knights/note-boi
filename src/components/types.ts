import { Ref } from 'vue';

export type DropMenuItemData = {
  label: string;
  clickHandler?: () => void;
  showIf?: () => boolean;
  testId?: string;
  disabled?: boolean;
  selected?: boolean | Ref<boolean>;
  danger?: boolean;
  subMenu?: DropMenuItemData[];
};

export type Bounds = {
  top: number;
  left: number;
  height: number;
  width: number;
};
