import { reactive } from 'vue';

import { AppError, Storage } from '../../classes';

import { storedUnsyncedNoteIds, UnsyncedNoteIds } from './noteSync';

export const syncState = reactive({
  username: Storage.get('USERNAME') || '',
  password: '',
  newPassword: '',
  isLoading: false,
  isLogin: true, // For switching login/signup form
  isLoggedIn: false,
  appError: new AppError(),
  unsyncedNoteIds: <UnsyncedNoteIds>{
    new: storedUnsyncedNoteIds?.new || '',
    edited: new Set<string>(storedUnsyncedNoteIds?.edited),
    deleted: new Set<string>(storedUnsyncedNoteIds?.deleted),
    get size() {
      return this.edited.size + this.deleted.size;
    },
    clear() {
      this.new = '';
      this.edited.clear();
      this.deleted.clear();

      Storage.remove('UNSYNCED');
    },
    add(ids): void {
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

      Storage.setJson('UNSYNCED', {
        new: this.new,
        edited: [...this.edited],
        deleted: [...this.deleted],
      });
    },
  },
});

export * from './auth';
export * from './account';
export * from './noteSync';
export * from './utils';
