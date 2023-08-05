export const NOTE_EVENTS = {
  new: 'note-new',
  /** For preventing note edit on text change. */
  select: 'note-select',
  /** For whenever the content of a note is changed. */
  change: 'note-change',
  unsynced: 'note-unsynced',
} as const;

export const STORAGE_KEYS = {
  USERNAME: 'username',
  TOKEN: 'token',
  UNSYNCED: 'unsynced-note-ids',
  THEME: 'theme',
  MENU_WIDTH: 'note-menu-width',
} as const;

export const TAURI_COMMANDS = [
  'get_all_notes',
  'delete_note',
  'new_note',
  'edit_note',
  'sync_local_notes',
  'export_notes',
] as const;

export type TauriCommand = (typeof TAURI_COMMANDS)[number];
