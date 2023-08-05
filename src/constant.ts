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

export const ENDPOINTS = [
  '/signup',
  '/login',
  '/logout',
  '/notes',
  '/account/delete',
  '/account/password/change',
] as const;

export type Endpoint = (typeof ENDPOINTS)[number];

export const TAURI_COMMANDS = [
  'get_all_notes',
  'delete_note',
  'new_note',
  'edit_note',
  'sync_local_notes',
  'export_notes',
] as const;

export type TauriCommand = (typeof TAURI_COMMANDS)[number];

export const TAURI_EMITS = ['login', 'logout', 'tauri://update-install'] as const;

export type TauriEmit = (typeof TAURI_EMITS)[number];

export const TAURI_LISTENERS = [
  'reload',
  'new-note',
  'delete-note',
  'export-note',
  'export-all-notes',
  'push-notes',
  'login',
  'logout',
  'signup',
  'change-password',
  'delete-account',
  'tauri://close-requested',
] as const;

export type TauriListener = (typeof TAURI_LISTENERS)[number];
