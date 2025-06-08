import { reactive } from 'vue';

import { AppError, Storage } from '../../classes';

import { storedUnsyncedNoteIds } from './notes';

export const syncState = reactive({
  username: Storage.get('USERNAME') || '',
  password: '',
  newPassword: '',
  loadingCount: 0,
  isLoggedIn: false,
  appError: new AppError(),
  unsyncedNoteIds: {
    new: storedUnsyncedNoteIds?.new || '',
    edited: new Set<string>(storedUnsyncedNoteIds?.edited),
    deleted: new Set<string>(storedUnsyncedNoteIds?.deleted),
    get size() {
      return this.edited.size + this.deleted.size;
    },
    clear(clearNew = false) {
      if (clearNew) {
        this.new = '';
      }

      this.edited.clear();
      this.deleted.clear();
      this.store();
    },
    set(ids) {
      if (ids.new !== undefined) this.new = ids.new;

      ids.edited?.forEach((id) => this.edited.add(id));

      // Only track deleted notes if logged in
      ids.deleted?.forEach((id) => {
        this.deleted.add(id);

        if (this.edited.has(id)) {
          this.edited.delete(id);
        }
      });

      if (this.edited.has(this.new) || this.deleted.has(this.new)) {
        this.new = '';
      }

      this.store();
    },
    store() {
      if (this.size === 0 && !this.new) {
        Storage.remove('UNSYNCED');

        return;
      }

      Storage.setJson('UNSYNCED', {
        new: this.new,
        edited: [...this.edited],
        deleted: [...this.deleted],
      });
    },
  } satisfies UnsyncedNoteIds,
});

export type UnsyncedNoteIds = {
  new: string;
  edited: Set<string>;
  deleted: Set<string>;
  size: number;
  clear: () => void;
  set: (ids: { new?: string; edited?: string[]; deleted?: string[] }) => void;
  store: () => void;
};

export * from './auth';
export * from './account';
export * from './notes';
export * from './utils';
