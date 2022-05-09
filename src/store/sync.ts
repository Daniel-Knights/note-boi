import { reactive } from 'vue';
import { http, invoke } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';

import { isDev, isEmptyNote, localStorageParse, tauriEmit } from '../utils';
import { NOTE_EVENTS } from '../constant';
import {
  findNote,
  Note,
  selectNote,
  sortStateNotes,
  state as noteState,
  UnsyncedEventDetail,
} from './note';

export enum ErrorType {
  None,
  Auth,
  Push,
  Pull,
  Logout,
}

export type UnsyncedNoteIds = {
  new: string;
  edited: Set<string>;
  deleted: Set<string>;
  size: number;
  clear: () => void;
  add: (ids: { new?: string; edited?: string[]; deleted?: string[] }) => void;
};

const autoSync = localStorage.getItem('auto-sync') as 'true' | 'false' | null;
const unsyncedNoteIds: Partial<UnsyncedNoteIds> = localStorageParse('unsynced-note-ids');

export const state = reactive({
  username: localStorage.getItem('username') || '',
  password: '',
  token: localStorage.getItem('token') || '',
  isLoading: false,
  isLogin: true, // For switching login/signup form
  autoSyncEnabled: autoSync !== null ? autoSync === 'true' : true,
  error: {
    type: ErrorType.None,
    message: '',
  },
  unsyncedNoteIds: <UnsyncedNoteIds>{
    new: unsyncedNoteIds.new,
    edited: new Set<string>(unsyncedNoteIds.edited),
    deleted: new Set<string>(unsyncedNoteIds.deleted),
    get size() {
      return this.edited.size + this.deleted.size;
    },
    clear() {
      this.new = '';
      this.edited.clear();
      this.deleted.clear();
      localStorage.removeItem('unsynced-note-ids');
    },
    add(ids): void {
      if (ids.new !== undefined) this.new = ids.new;
      ids.edited?.forEach((id) => this.edited.add(id));
      ids.deleted?.forEach((id) => this.deleted.add(id));

      if (this.edited.has(this.new) || this.deleted.has(this.new)) {
        this.new = '';
      }

      localStorage.setItem(
        'unsynced-note-ids',
        JSON.stringify({
          new: this.new,
          edited: [...this.edited],
          deleted: [...this.deleted],
        })
      );
    },
  },
});

// Utils //

/** Parses an error response and returns a formatted message. */
function parseErrorRes(res: Response<Record<string, unknown>>) {
  const unknownErrorMessage = 'Unknown error, please try again';

  if (!res.data) return unknownErrorMessage;

  return typeof res.data.error === 'string' ? res.data.error : unknownErrorMessage;
}

/** Resets {@link state.error}. */
export function resetError(): void {
  state.error = { type: ErrorType.None, message: '' };
}

/** Wrapper for {@link http.fetch}. */
function tauriFetch<T>(
  endpoint: string,
  method: 'POST' | 'PUT',
  payload?: Record<string, unknown>
): Promise<Response<T>> {
  const baseUrl = isDev()
    ? 'http://localhost:8000'
    : 'https://note-boi-server.herokuapp.com';

  return http.fetch<T>(`${baseUrl}/api${endpoint}`, {
    method,
    body: {
      type: 'Json',
      payload,
    },
  });
}

/** Catches hanging requests (e.g. due to server error) */
function catchHang(err: unknown, type: ErrorType) {
  console.error(err);

  state.isLoading = false;
  state.error = {
    type,
    message: 'Request failed',
  };
}

function clientSideLogout() {
  state.token = '';
  state.username = '';

  localStorage.removeItem('token');
  localStorage.removeItem('username');
}

/** Sets user preference for auto-syncing to {@link state} and `localStorage` */
export function setAutoSync(enabled: boolean): void {
  state.autoSyncEnabled = enabled;
  localStorage.setItem('auto-sync', enabled ? 'true' : 'false');
}

/** Syncs local and remote notes. */
function syncNotes(remoteNotes: Note[]) {
  const hasNoLocalNotes = noteState.notes.length === 1 && isEmptyNote(noteState.notes[0]);

  if (hasNoLocalNotes) {
    state.unsyncedNoteIds.clear();
  }

  const unsyncedIds = [state.unsyncedNoteIds.new, ...state.unsyncedNoteIds.edited];
  const unsyncedDeletedIds = [...state.unsyncedNoteIds.deleted];
  const unsyncedNotes = unsyncedIds.map(findNote).filter(Boolean) as Note[];
  const syncedNotes = remoteNotes.filter((nt) => {
    return !unsyncedIds.includes(nt.id) && !unsyncedDeletedIds.includes(nt.id);
  });

  noteState.notes = [...syncedNotes, ...unsyncedNotes];

  sortStateNotes();

  if (hasNoLocalNotes) {
    selectNote(noteState.notes[0].id);
  }

  return invoke('sync_all_local_notes', { notes: noteState.notes }).catch(console.error);
}

// Routes //

// Login
export async function login(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/login', 'POST', {
    username: state.username,
    password: state.password,
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  if (res.ok) {
    resetError();
    tauriEmit('login');
    await syncNotes(res.data.notes as Note[]);

    state.token = res.data.token as string;
    state.password = '';

    localStorage.setItem('username', state.username);
    localStorage.setItem('token', state.token);
  }

  state.isLoading = false;

  if (!res.ok) {
    state.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Signup
export async function signup(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string>>('/signup', 'POST', {
    username: state.username,
    password: state.password,
    notes: noteState.notes.filter((nt) => !isEmptyNote(nt)),
  }).catch((err) => catchHang(err, ErrorType.Auth));

  if (!res) return;

  state.isLoading = false;

  if (res.ok) {
    resetError();
    tauriEmit('login');

    state.token = res.data.token;
    state.password = '';

    localStorage.setItem('username', state.username);
    localStorage.setItem('token', state.token);
  } else {
    state.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Logout
export async function logout(): Promise<void> {
  if (!state.token) return; // Prevent bug where event.emit triggers event.listen

  state.isLoading = true;

  const res = await tauriFetch<Record<string, never | string>>('/logout', 'POST', {
    username: state.username,
    token: state.token,
  }).catch((err) => catchHang(err, ErrorType.Logout));

  if (!res) return;

  state.isLoading = false;

  if (res.ok) {
    resetError();
    tauriEmit('logout');
    clientSideLogout();
  } else {
    state.error = {
      type: ErrorType.Logout,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Pull
export async function pull(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/notes', 'POST', {
    username: state.username,
    token: state.token,
  }).catch((err) => catchHang(err, ErrorType.Pull));

  if (!res) return;

  if (res.ok) {
    resetError();
    await syncNotes(res.data.notes as Note[]);
  }

  state.isLoading = false;

  if (!res.ok) {
    state.error = {
      type: ErrorType.Pull,
      message: parseErrorRes(res),
    };

    // User not found
    if (res.status === 404) clientSideLogout();

    console.error(res.data);
  }
}

// Push
export async function push(): Promise<void> {
  state.isLoading = true;

  // Cache ids and clear before request to prevent
  // race condition if a note is edited mid-push
  const cachedUnsyncedNoteIds = {
    new: state.unsyncedNoteIds.new,
    edited: [...state.unsyncedNoteIds.edited],
    deleted: [...state.unsyncedNoteIds.deleted],
  };
  state.unsyncedNoteIds.clear();

  const res = await tauriFetch<Record<string, never | string>>('/notes', 'PUT', {
    username: state.username,
    token: state.token,
    notes: noteState.notes.filter((nt) => !isEmptyNote(nt)),
  }).catch((err) => catchHang(err, ErrorType.Push));

  if (!res) return;

  state.isLoading = false;

  if (res.ok) {
    resetError();
  } else {
    // Add back unsynced note ids
    state.unsyncedNoteIds.add(cachedUnsyncedNoteIds);
    state.error = {
      type: ErrorType.Push,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

// Auto-syncing
let timeout: number | undefined;

export function autoPush(): void {
  if (!state.autoSyncEnabled || !state.username) return;

  clearTimeout(timeout);
  timeout = window.setTimeout(push, 500);
}

// Keep track of notes with unsynced changes
document.addEventListener(
  NOTE_EVENTS.unsynced,
  (ev: CustomEventInit<UnsyncedEventDetail>) => {
    if (!state.token || !ev.detail) return;

    state.unsyncedNoteIds.add({ [ev.detail.type]: [ev.detail.noteId] });
  }
);
