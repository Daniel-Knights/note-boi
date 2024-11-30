import { ColourTheme, UpdateStrategy } from './constant';

export const STORAGE_KEYS_STRING = {
  USERNAME: 'username',
  THEME: 'theme',
  MENU_WIDTH: 'note-menu-width',
  UPDATE_SEEN: 'update-seen',
  UPDATE_STRATEGY: 'update-strategy',
} as const;

export const STORAGE_KEYS_JSON = {
  UNSYNCED: 'unsynced-note-ids',
} as const;

export const STORAGE_KEYS = { ...STORAGE_KEYS_STRING, ...STORAGE_KEYS_JSON };

export type StorageKey = keyof typeof STORAGE_KEYS;
export type StorageKeyString = keyof typeof STORAGE_KEYS_STRING;
export type StorageKeyJson = keyof typeof STORAGE_KEYS_JSON;

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
  [K in StorageKey as StorageValues[K] extends string ? K : never]: StorageValues[K];
};

type StorageValuesJson = {
  [K in StorageKey as StorageValues[K] extends object ? K : never]: StorageValues[K];
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
