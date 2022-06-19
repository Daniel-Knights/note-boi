import { Ref } from 'vue';

export type DropMenuItemData = {
  label: string;
  clickHandler?: () => void;
  testId?: string;
  disabled?: boolean;
  selected?: boolean | Ref<boolean>;
  confirm?: boolean;
  subMenu?: DropMenuItemData[];
};
