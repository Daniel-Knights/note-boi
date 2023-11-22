import { event, invoke } from '@tauri-apps/api';
import { EventCallback, UnlistenFn } from '@tauri-apps/api/event';

import { TauriCommand, TauriCommandPayloads, TauriEmit, TauriListener } from './constant';
import type { Note } from './store/note';

/** `process.env.NODE_ENV === 'development'`. */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** Formats Unix time to date-time. */
export function unixToDateTime(unixTime: number): string {
  return Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: isDev() ? 'long' : 'short',
  }).format(unixTime);
}

/** Gets key value from `localStorage` and parses it as JSON. */
export function localStorageParse<T>(key: string): T | null {
  const storedItem = localStorage.getItem(key);

  return storedItem ? JSON.parse(storedItem) : null;
}

/** Returns `true` if string consists of only whitespace characters or is empty. */
export function isWhitespaceOnly(text?: string): boolean {
  return text?.trim() === '';
}

/** Returns true if note content is empty or note is `undefined`. */
export function isEmptyNote(note?: Note): boolean {
  if (!note) return true;

  return isWhitespaceOnly(note.content.title) && isWhitespaceOnly(note.content.body);
}

/** Calls {@link event.emit}, with stronger typing for `id`. */
export function tauriEmit<T>(id: TauriEmit, payload?: T): Promise<void> {
  return event.emit(id, { isFrontendEmit: true, data: payload });
}

/** Calls {@link event.listen}, with stronger typing for `id`. */
export function tauriListen<T>(
  id: TauriListener,
  cb: EventCallback<T>
): Promise<UnlistenFn> {
  return event.listen<{ isFrontendEmit: boolean; data: T }>(id, (ev) => {
    if (ev.payload.isFrontendEmit) return;

    cb({ ...ev, payload: ev.payload.data });
  });
}

/** Calls {@link invoke}, with stronger typing for `cmd`. */
export function tauriInvoke<T extends TauriCommand>(
  cmd: T,
  args?: TauriCommandPayloads[T]['payload']
): Promise<TauriCommandPayloads[T]['response']> {
  return invoke(cmd, args);
}
