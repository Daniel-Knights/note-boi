import { reactive } from 'vue';
import { http, invoke } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';

import { getAllNotes, Note, state as noteState } from './note';
import { isDev } from '../utils';

export enum ErrorType {
  None,
  Auth,
  Sync,
}

interface State {
  username: string;
  password: string;
  token: string;
  hasUnsyncedNotes: boolean;
  isSyncing: boolean;
  error: {
    type: ErrorType;
    message: string;
  };
}

export const state = reactive<State>({
  username: localStorage.getItem('username') || '',
  password: '',
  token: localStorage.getItem('token') || '',
  hasUnsyncedNotes: false,
  isSyncing: false,
  error: {
    type: ErrorType.None,
    message: '',
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
  const baseUrl = isDev() ? 'http://localhost:8000' : 'TODO';

  return http.fetch<T>(`${baseUrl}/api${endpoint}`, {
    method,
    body: {
      type: 'Json',
      payload,
    },
  });
}

// Routes //

export async function login(): Promise<void> {
  state.isSyncing = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/login', 'POST', {
    username: state.username,
    password: state.password,
  });

  if (res.ok) {
    await invoke('sync_all_local_notes', { notes: res.data.notes }).catch(console.error);
    await getAllNotes().catch(console.error);

    state.token = res.data.token as string;
    state.password = '';

    localStorage.setItem('username', state.username);
    localStorage.setItem('token', state.token);
  }

  state.isSyncing = false;

  if (!res.ok) {
    state.error = {
      type: ErrorType.Auth,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

export async function signup(): Promise<void> {
  state.isSyncing = true;

  const res = await tauriFetch<Record<string, string>>('/signup', 'POST', {
    username: state.username,
    password: state.password,
  });

  state.isSyncing = false;

  if (res.ok) {
    state.username = res.data.username;
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

export function logout(): void {
  state.username = '';
  state.token = '';

  localStorage.removeItem('username');
  localStorage.removeItem('token');
}

export async function pull(): Promise<void> {
  state.isSyncing = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/notes', 'POST', {
    username: state.username,
    token: state.token,
  });

  if (res.ok) {
    await invoke('sync_all_local_notes', { notes: res.data.notes }).catch(console.error);
    await getAllNotes().catch(console.error);
  }

  state.isSyncing = false;

  if (!res.ok) {
    state.error = {
      type: ErrorType.Sync,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

export async function push(): Promise<void> {
  state.isSyncing = true;

  const res = await tauriFetch<Record<string, never | string>>('/notes', 'PUT', {
    username: state.username,
    token: state.token,
    notes: noteState.notes,
  });

  state.isSyncing = false;

  if (res.ok) {
    state.hasUnsyncedNotes = false;
  } else {
    state.error = {
      type: ErrorType.Sync,
      message: parseErrorRes(res),
    };

    console.error(res.data);
  }
}

document.addEventListener('note-unsynced', () => {
  if (state.token) {
    state.hasUnsyncedNotes = true;
  }
});
