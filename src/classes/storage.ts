import { DeletedNote } from '../api';
import { ColourTheme, UpdateStrategy } from '../constant';

export const STORAGE_KEYS_STRING = {
  MENU_WIDTH: 'note-menu-width',
  THEME: 'theme',
  UPDATE_SEEN: 'update-seen',
  UPDATE_STRATEGY: 'update-strategy',
  USERNAME: 'username',
} satisfies Record<StorageKeyString, string>;

export const STORAGE_KEYS_JSON = {
  UNSYNCED: 'unsynced-note-uuids',
} satisfies Record<StorageKeyJson, string>;

export const STORAGE_KEYS = { ...STORAGE_KEYS_STRING, ...STORAGE_KEYS_JSON };

/** `localStorage` convenience methods with stronger typing. */
export class Storage {
  static get<T extends keyof StorageValuesString>(key: T): StorageValues[T] | null {
    return localStorage.getItem(STORAGE_KEYS[key]) as StorageValues[T] | null;
  }

  static set<T extends keyof StorageValuesString>(key: T, value: StorageValues[T]): void {
    return localStorage.setItem(STORAGE_KEYS[key], value as string);
  }

  static remove(key: StorageKey) {
    return localStorage.removeItem(STORAGE_KEYS[key]);
  }

  static clear() {
    return localStorage.clear();
  }

  static getJson<T extends keyof StorageValuesJson>(key: T): StorageValues[T] | null {
    const storedItem = localStorage.getItem(STORAGE_KEYS[key]);

    return storedItem ? JSON.parse(storedItem) : null;
  }

  static setJson<T extends keyof StorageValuesJson>(key: T, value: StorageValues[T]) {
    return localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  }
}

//// Types

type StorageValues = {
  MENU_WIDTH: string;
  THEME: ColourTheme;
  UNSYNCED: {
    new: string;
    edited: string[];
    deleted: DeletedNote[];
  };
  UPDATE_SEEN: string;
  UPDATE_STRATEGY: UpdateStrategy;
  USERNAME: string;
};

export type StorageKey = keyof StorageValues;

type StorageValuesString = {
  [K in StorageKey as StorageValues[K] extends string ? K : never]: StorageValues[K];
};

type StorageValuesJson = {
  [K in StorageKey as StorageValues[K] extends object ? K : never]: StorageValues[K];
};

export type StorageKeyString = keyof StorageValuesString;
export type StorageKeyJson = keyof StorageValuesJson;
