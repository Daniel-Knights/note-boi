import { event } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';
import { EventCallback, UnlistenFn } from '@tauri-apps/api/event';

import { Dialog, type Note } from './classes';
import { TauriCommand, TauriCommandPayloads, TauriEmit, TauriListener } from './constant';

/** `process.env.NODE_ENV === 'development'`. */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isWeb() {
  return process.env.APP_ENV === 'web';
}

export function isDesktop() {
  return process.env.APP_ENV === 'desktop';
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

/**
 * Returns `str` with all regex special characters escaped.
 * Copied from https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
 */
export function escapeRegex(str: string) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Constrains a numeric value within a specified range.
 */
export function mathClamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

/**
 * Calls {@link event.emit}, with stronger typing for `id`.
 * Noop in web environments.
 */
export function tauriEmit<T>(id: TauriEmit, payload?: T): Promise<void> {
  if (isWeb()) return Promise.resolve();

  return event.emit(id, { isFrontendEmit: true, data: payload });
}

/**
 * Calls {@link event.listen}, with stronger typing for `id`.
 * Noop in web environments.
 */
export function tauriListen<T>(
  id: TauriListener,
  cb: EventCallback<T | undefined>
): Promise<UnlistenFn | void> {
  if (isWeb()) return Promise.resolve();

  return event.listen<{ isFrontendEmit: boolean; data: T } | undefined>(id, (ev) => {
    if (ev.payload?.isFrontendEmit) return;

    cb({ ...ev, payload: ev.payload?.data });
  });
}

/**
 * Calls {@link invoke}, but with stronger typing.
 * Noop in web environments.
 */
export function tauriInvoke<T extends TauriCommand>(
  cmd: T,
  args?: TauriCommandPayloads[T]['payload'],
  options?: { rethrowErrors?: boolean; promptRetryOnError?: boolean }
): Promise<TauriCommandPayloads[T]['response'] | void | never> {
  if (isWeb()) return Promise.resolve();

  const errMsgMap = {
    backup_notes: 'backup notes',
    delete_access_token: 'delete access token',
    delete_note: 'delete note',
    edit_note: 'edit note',
    export_notes: 'export notes',
    get_access_token: 'get access token',
    get_all_notes: 'get notes',
    import_notes: 'import notes',
    set_access_token: 'set access token',
    sync_local_notes: 'sync local notes',
  } satisfies Record<TauriCommand, string>;

  return invoke<T>(cmd, args).catch(async (err) => {
    if (options?.rethrowErrors) throw err;

    console.error(`${cmd} error:`);
    console.error(err);

    if (!options?.promptRetryOnError) return;

    const tryAgain = await Dialog.ask(`Failed to ${errMsgMap[cmd]}. Try again?`, {
      kind: 'error',
      title: capitalise(errMsgMap[cmd]),
    });
    if (!tryAgain) return;

    return tauriInvoke(cmd, args, options);
  });
}
