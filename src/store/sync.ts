import { reactive } from 'vue';
import { http, invoke } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';

import { getAllNotes, Note, state as noteState } from './note';
import { isDev, tauriEmit } from '../utils';

export enum ErrorType {
  None,
  Auth,
  Push,
  Pull,
  Logout,
}

interface State {
  username: string;
  password: string;
  token: string;
  hasUnsyncedNotes: boolean;
  isLoading: boolean;
  isLogin: boolean; // For switching login/signup form
  autoSyncEnabled: boolean;
  error: {
    type: ErrorType;
    message: string;
  };
}

const autoSync = localStorage.getItem('auto-sync') as 'true' | 'false' | null;

export const state = reactive<State>({
  username: localStorage.getItem('username') || '',
  password: '',
  token: localStorage.getItem('token') || '',
  hasUnsyncedNotes: false,
  isLoading: false,
  isLogin: true,
  autoSyncEnabled: autoSync !== null ? autoSync === 'true' : true,
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

// Routes //

export async function login(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/login', 'POST', {
    username: state.username,
    password: state.password,
  });

  if (res.ok) {
    resetError();
    tauriEmit('login');

    await invoke('sync_all_local_notes', { notes: res.data.notes }).catch(console.error);
    await getAllNotes().catch(console.error);

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

export async function signup(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string>>('/signup', 'POST', {
    username: state.username,
    password: state.password,
    notes: noteState.notes,
  });

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

export async function logout(): Promise<void> {
  if (!state.token) return; // Prevent bug where event.emit triggers event.listen

  state.isLoading = true;

  const res = await tauriFetch<Record<string, never | string>>('/logout', 'POST', {
    username: state.username,
    token: state.token,
  });

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
  }
}

export async function pull(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, string | Note[]>>('/notes', 'POST', {
    username: state.username,
    token: state.token,
  });

  if (res.ok) {
    resetError();
    await invoke('sync_all_local_notes', { notes: res.data.notes }).catch(console.error);
    await getAllNotes().catch(console.error);
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

export async function push(): Promise<void> {
  state.isLoading = true;

  const res = await tauriFetch<Record<string, never | string>>('/notes', 'PUT', {
    username: state.username,
    token: state.token,
    notes: noteState.notes,
  });

  state.isLoading = false;

  if (res.ok) {
    resetError();
    state.hasUnsyncedNotes = false;
  } else {
    state.error = {
      type: ErrorType.Push,
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
