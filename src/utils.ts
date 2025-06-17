import { event } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';
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

/** Returns `true` if string consists of only whitespace characters or is empty. */
export function isWhitespaceOnly(text?: string): boolean {
  return text?.trim() === '';
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Returns true if note content is empty. */
export function isEmptyNote(note?: { content: Note['content'] }): boolean {
  if (!note) return false;

  return isWhitespaceOnly(note.content.title) && isWhitespaceOnly(note.content.body);
}

/** Checks if the given object has all the specified keys. */
export function hasKeys<T extends string>(
  obj: object | undefined,
  keys: T[]
): obj is { [key in T]: unknown } {
  if (!obj) return false;

  return keys.every((key) => key in obj);
}

/** Calls {@link event.emit}, with stronger typing for `id`. */
export function tauriEmit<T>(id: TauriEmit, payload?: T): Promise<void> {
  return event.emit(id, { isFrontendEmit: true, data: payload });
}

/** Calls {@link event.listen}, with stronger typing for `id`. */
export function tauriListen<T>(
  id: TauriListener,
  cb: EventCallback<T | undefined>
): Promise<UnlistenFn> {
  return event.listen<{ isFrontendEmit: boolean; data: T } | undefined>(id, (ev) => {
    if (ev.payload?.isFrontendEmit) return;

    cb({ ...ev, payload: ev.payload?.data });
  });
}

/** Calls {@link invoke}, but with stronger typing. */
export function tauriInvoke<T extends TauriCommand>(
  cmd: T,
  args?: TauriCommandPayloads[T]['payload']
): Promise<TauriCommandPayloads[T]['response']> {
  return invoke(cmd, args);
}
