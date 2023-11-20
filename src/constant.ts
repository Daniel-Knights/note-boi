import { EncryptedNote } from './store/sync/encryptor';

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

export type EndpointPayloads = {
  '/signup': {
    payload: {
      username: string;
      password: string;
      notes: EncryptedNote[];
    };
    response: {
      token: string;
    };
  };
  '/login': {
    payload: {
      username: string;
      password: string;
    };
    response: {
      token: string;
      notes: EncryptedNote[];
    };
  };
  '/logout': {
    payload: {
      username: string;
      token: string;
    };
    response: never;
  };
  '/notes/push': {
    payload: {
      username: string;
      token: string;
      notes: EncryptedNote[];
    };
    response: never;
  };
  '/notes/pull': {
    payload: {
      username: string;
      token: string;
    };
    response: {
      notes: EncryptedNote[];
    };
  };
  '/account/delete': {
    payload: {
      username: string;
      token: string;
    };
    response: never;
  };
  '/account/password/change': {
    payload: {
      username: string;
      token: string;
      current_password: string;
      new_password: string;
      notes: EncryptedNote[];
    };
    response: {
      token: string;
    };
  };
};

export type Endpoint = keyof EndpointPayloads;

export const ENDPOINTS: Endpoint[] = [
  '/signup',
  '/login',
  '/logout',
  '/notes/push',
  '/notes/pull',
  '/account/delete',
  '/account/password/change',
];

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
  'login',
  'logout',
  'signup',
  'change-password',
  'delete-account',
] as const;

export type TauriListener = (typeof TAURI_LISTENERS)[number];
