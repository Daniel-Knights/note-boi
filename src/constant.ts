export const NOTE_EVENTS = {
  new: 'note-new',
  /** For preventing note edit on text change. */
  select: 'note-select',
  /** For whenever the content of a note is changed. */
  change: 'note-change',
  unsynced: 'note-unsynced',
};

export const STORAGE_KEYS = {
  USERNAME: 'username',
  TOKEN: 'token',
  UNSYNCED: 'unsynced-note-ids',
  THEME: 'theme',
  MENU_WIDTH: 'note-menu-width',
};
