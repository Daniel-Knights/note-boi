import { DeletedNote } from '../api';

import { Storage } from './storage';

/**
 * Manages unsynced notes by tracking new, edited, and deleted notes.
 * Saves state to `localStorage`.
 */
export class UnsyncedNotesManager {
  /** UUID of the new unsynced note. */
  new: string;
  /** Set of UUIDs for edited unsynced notes. */
  edited: Set<string>;
  /** Array of deleted unsynced notes. */
  deleted: DeletedNote[];

  constructor() {
    const storedUnsyncedNotes = Storage.getJson('UNSYNCED');

    this.new = storedUnsyncedNotes?.new || '';
    this.edited = new Set<string>(storedUnsyncedNotes?.edited);
    this.deleted = storedUnsyncedNotes?.deleted ?? [];
  }

  /**
   * Returns the total number of unsynced notes (excluding new note).
   */
  get size() {
    return this.edited.size + this.deleted.length;
  }

  /** Clears all unsynced notes. */
  clear(clearNew = false) {
    if (clearNew) {
      this.new = '';
    }

    this.edited.clear();
    this.deleted.splice(0, this.deleted.length);
    this.store();
  }

  /**
   * Updates current unsynced notes.
   * If `new` is provided, it overwrites the current new note UUID.
   * If `edited` is provided, it adds to the current set.
   * If `deleted` is provided, it adds to the current set and removes them from `edited` if they exist.
   * If the new note UUID is in either edited or deleted, it is reset to an empty string.
   */
  set(notes: { new?: string; edited?: string[]; deleted?: DeletedNote[] }) {
    if (notes.new !== undefined) this.new = notes.new;

    notes.edited?.forEach((uuid) => this.edited.add(uuid));

    notes.deleted?.forEach((nt) => {
      this.deleted.push(nt);

      if (this.edited.has(nt.uuid)) {
        this.edited.delete(nt.uuid);
      }
    });

    if (this.edited.has(this.new) || this.deleted.some((nt) => nt.uuid === this.new)) {
      this.new = '';
    }

    this.store();
  }

  /**
   * Stores the current state of unsynced notes in `localStorage`.
   */
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
  }
}
