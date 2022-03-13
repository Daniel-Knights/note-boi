import { reactive } from 'vue';
import { http, invoke } from '@tauri-apps/api';
import type { Response } from '@tauri-apps/api/http';

import { getAllNotes, Note, state as noteState } from './note';

interface State {
  username: string;
  password: string;
  token: string;
  hasUnsyncedNotes: boolean;
  isSyncing: boolean;
  error: string;
}

export const state = reactive<State>({
  username: localStorage.getItem('username') || '',
  password: '',
  token: localStorage.getItem('token') || '',
  hasUnsyncedNotes: false,
  isSyncing: false,
  error: '',
});

/** Parses an error response and returns a formatted message */
function parseErrorRes(res: Response<Record<string, unknown>>) {
  const unknownErrorMessage = 'Unknown error, please try again';

  if (!res.data) return unknownErrorMessage;

  return typeof res.data.error === 'string' ? res.data.error : unknownErrorMessage;
}

export async function signup(): Promise<void> {
  state.isSyncing = true;

  const res = await http.fetch<Record<string, string>>('/signup', {
    method: 'POST',
    body: {
      type: 'json',
      payload: {
        username: state.username,
        password: state.password,
      },
    },
  });

  state.isSyncing = false;

  if (res.ok) {
    state.username = res.data.username;
    state.token = res.data.token;
    state.password = '';

    localStorage.setItem('username', state.username);
    localStorage.setItem('token', state.token);
  } else {
    state.error = parseErrorRes(res);

    console.error(res.data);
  }
}

export async function login(): Promise<void> {
  state.isSyncing = true;

  const res = await http.fetch<Record<string, string | Note[]>>('/login', {
    method: 'POST',
    body: {
      type: 'json',
      payload: {
        username: state.username,
        password: state.password,
      },
    },
  });

  if (res.ok) {
    await invoke('sync_all_notes', { notes: res.data.notes }).catch(console.error);
    await getAllNotes().catch(console.error);

    state.token = res.data.token as string;
    state.password = '';

    localStorage.setItem('username', state.username);
    localStorage.setItem('token', state.token);
  }

  state.isSyncing = false;

  if (!res.ok) {
    state.error = parseErrorRes(res);

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

  const res = await http.fetch<Record<string, string | Note[]>>('/notes', {
    method: 'POST',
    body: {
      type: 'json',
      payload: {
        username: state.username,
        token: state.token,
      },
    },
  });

  if (res.ok) {
    await invoke('sync_all_notes', { notes: res.data.notes }).catch(console.error);
    await getAllNotes().catch(console.error);
  }

  state.isSyncing = false;

  if (!res.ok) {
    state.error = parseErrorRes(res);

    console.error(res.data);
  }
}

export async function push(): Promise<void> {
  state.isSyncing = true;

  await invoke('sync_all_notes', { notes: noteState.notes }).catch(console.error);

  const res = await http.fetch<Record<string, never | string>>('/notes', {
    method: 'PUT',
    body: { type: 'json', payload: noteState.notes },
  });

  state.isSyncing = false;

  if (res.ok) {
    state.hasUnsyncedNotes = false;
  } else {
    state.error = parseErrorRes(res);

    console.error(res.data);
  }
}

document.addEventListener('note-unsynced', () => {
  if (state.token) {
    state.hasUnsyncedNotes = true;
  }
});
