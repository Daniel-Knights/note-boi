import { ColourTheme, UpdateStrategy } from './constant';

const STORAGE_KEYS = {
  USERNAME: 'username',
  UNSYNCED: 'unsynced-note-ids',
  THEME: 'theme',
  MENU_WIDTH: 'note-menu-width',
  UPDATE_SEEN: 'update-seen',
  UPDATE_STRATEGY: 'update-strategy',
} as const;

type StorageKey = keyof typeof STORAGE_KEYS;

type StorageValues = {
  USERNAME: string;
  UNSYNCED: {
    new: string;
    edited: string[];
    deleted: string[];
  };
  THEME: ColourTheme;
  MENU_WIDTH: string;
  UPDATE_SEEN: string;
  UPDATE_STRATEGY: UpdateStrategy;
};

type StorageValuesString = {
  [K in keyof StorageValues as StorageValues[K] extends string
    ? K
    : never]: StorageValues[K];
};

type StorageValuesJson = {
  [K in keyof StorageValues as StorageValues[K] extends object
    ? K
    : never]: StorageValues[K];
};

/** `localStorage` convenience methods with stronger typing. */
export const storage = {
  get<T extends keyof StorageValuesString>(key: T): StorageValues[T] | null {
    return localStorage.getItem(STORAGE_KEYS[key]) as StorageValues[T] | null;
  },

  set<T extends keyof StorageValuesString>(key: T, value: StorageValues[T]): void {
    return localStorage.setItem(STORAGE_KEYS[key], value as string);
  },

  remove(key: StorageKey) {
    return localStorage.removeItem(STORAGE_KEYS[key]);
  },

  clear() {
    return localStorage.clear();
  },

  getJson<T extends keyof StorageValuesJson>(key: T): StorageValues[T] | null {
    const storedItem = localStorage.getItem(STORAGE_KEYS[key]);

    return storedItem ? JSON.parse(storedItem) : null;
  },

  setJson<T extends keyof StorageValuesJson>(key: T, value: StorageValues[T]) {
    return localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  },
};
