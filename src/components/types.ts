export type DropMenuItemData = {
  label: string;
  clickHandler?: () => void;
  testId?: string;
  disabled?: boolean;
  selected?: boolean;
  subMenu?: DropMenuItemData[];
};
