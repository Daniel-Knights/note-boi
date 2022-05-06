import { event } from '@tauri-apps/api';
import { EventCallback } from '@tauri-apps/api/event';

import type { Note } from './store/note';

/** `process.env.NODE_ENV === 'development'` */
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

/** Returns `true` if string consists of only whitespace characters or is empty. */
export function isWhitespaceOnly(text?: string): boolean {
  return text?.trim() === '';
}

/** Returns true if note content is empty or note is `undefined`. */
export function isEmptyNote(note?: Note): boolean {
  if (!note) return true;

  return isWhitespaceOnly(note.content.title) && isWhitespaceOnly(note.content.body);
}

/** Calls {@link event.emit}, with stronger typing for `id` */
export function tauriEmit<T>(id: 'login' | 'logout', payload?: T): void {
  event.emit(id, payload);
}

/** Calls {@link event.listen}, with stronger typing for `id` */
export function tauriListen(
  id:
    | 'reload'
    | 'new-note'
    | 'delete-note'
    | 'push-notes'
    | 'login'
    | 'logout'
    | 'signup',
  cb: EventCallback<unknown>
): void {
  event.listen(id, cb);
}
