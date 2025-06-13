import { EncryptedNote } from './classes';
import { Note } from './store/note';

export const MIN_PASSWORD_LENGTH = 6;

export const NOTE_EVENTS = {
  new: 'note-new',
  /** For preventing note edit on text change. */
  select: 'note-select',
  /** For whenever the content of a note is changed. */
  change: 'note-change',
  unsynced: 'note-unsynced',
} as const;

// Endpoints
export type EndpointPayloads = {
  '/auth/signup': {
    payload: {
      username: string;
      password: string;
      notes: EncryptedNote[];
    };
    response: {
      access_token: string;
    };
  };
  '/auth/login': {
    payload: {
      username: string;
      password: string;
      notes: EncryptedNote[];
      deleted_note_ids: string[];
    };
    response: {
      note_diff: NoteDiff;
      access_token: string;
    };
  };
  '/auth/logout': {
    payload: never;
    response: never;
  };
  '/notes/sync': {
    payload: {
      notes: EncryptedNote[];
      deleted_note_ids: string[];
    };
    response: {
      note_diff: NoteDiff;
      access_token: string;
    };
  };
  '/account/delete': {
    payload: never;
    response: never;
  };
  '/account/change-password': {
    payload: {
      current_password: string;
      new_password: string;
      notes: EncryptedNote[];
    };
    response: {
      access_token: string;
    };
  };
};

export type NoteDiff = {
  added: EncryptedNote[];
  edited: EncryptedNote[];
  deleted_ids: string[];
};

export type DecryptedNoteDiff = {
  added: Note[];
  edited: Note[];
  deleted_ids: string[];
};

export type Endpoint = keyof EndpointPayloads;

export const ENDPOINTS = [
  '/auth/signup',
  '/auth/login',
  '/auth/logout',
  '/notes/sync',
  '/account/delete',
  '/account/change-password',
] satisfies Endpoint[];

// Tauri commands
export type TauriCommandPayloads = {
  get_all_notes: {
    payload: never;
    response: Note[];
  };
  delete_note: {
    payload: {
      id: string;
    };
    response: never;
  };
  new_note: {
    payload: {
      note: Note;
    };
    response: never;
  };
  edit_note: {
    payload: {
      note: Note;
    };
    response: never;
  };
  sync_local_notes: {
    payload: {
      notes: Note[];
    };
    response: never;
  };
  export_notes: {
    payload: {
      notes: Note[];
      saveDir: string | string[];
    };
    response: never;
  };
  set_access_token: {
    payload: {
      username: string;
      accessToken: string;
    };
    response: never;
  };
  get_access_token: {
    payload: {
      username: string;
    };
    response: string;
  };
  delete_access_token: {
    payload: {
      username: string;
    };
    response: never;
  };
};

export type TauriCommand = keyof TauriCommandPayloads;

export const TAURI_COMMANDS = [
  'get_all_notes',
  'delete_note',
  'new_note',
  'edit_note',
  'sync_local_notes',
  'export_notes',
  'set_access_token',
  'get_access_token',
  'delete_access_token',
] satisfies TauriCommand[];

// Tauri emits
export const TAURI_EMITS = ['auth'] as const;

export type TauriEmit = (typeof TAURI_EMITS)[number];

// Tauri listeners
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

// Update strategies
export const UPDATE_STRATEGIES = ['auto', 'manual'] as const;

export type UpdateStrategy = (typeof UPDATE_STRATEGIES)[number];

// Colour themes
export const COLOUR_THEMES = ['Light', 'Dark', 'System'] as const;

export type ColourTheme = (typeof COLOUR_THEMES)[number];
