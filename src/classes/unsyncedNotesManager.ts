import { Storage } from './storage';

/**
 * Manages unsynced notes by tracking new, edited, and deleted notes.
 * Saves state to `localStorage`.
 */
export class UnsyncedNotesManager {
  /** ID of the new unsynced note. */
  new: string;
  /** Set of IDs for edited unsynced notes. */
  edited: Set<string>;
  /** Set of IDs for deleted unsynced notes. */
  deleted: Set<string>;

  constructor() {
    const storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

    this.new = storedUnsyncedNoteIds?.new || '';
    this.edited = new Set<string>(storedUnsyncedNoteIds?.edited);
    this.deleted = new Set<string>(storedUnsyncedNoteIds?.deleted);
  }

  /**
   * Returns the total number of unsynced notes (excluding new note).
   */
  get size() {
    return this.edited.size + this.deleted.size;
  }

  /** Clears all unsynced notes. */
  clear(clearNew = false) {
    if (clearNew) {
      this.new = '';
    }

    this.edited.clear();
    this.deleted.clear();
    this.store();
  }

  /**
   * Updates current unsynced notes.
   * If `new` is provided, it overwrites the current new note ID.
   * If `edited` is provided, it adds to the current set.
   * If `deleted` is provided, it adds to the current set and removes them from `edited` if they exist.
   * If the new note ID is in either edited or deleted, it is reset to an empty string.
   */
  set(ids: { new?: string; edited?: string[]; deleted?: string[] }) {
    if (ids.new !== undefined) this.new = ids.new;

    ids.edited?.forEach((id) => this.edited.add(id));

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
