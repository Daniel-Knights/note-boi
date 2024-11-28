import { DOMWrapper, VueWrapper } from '@vue/test-utils';

import * as n from '../store/note';
import * as s from '../store/sync';
import * as u from '../store/update';
import { AppError, ErrorConfig } from '../appError';
import { EncryptedNote } from '../store/sync/encryptor';
import { hasKeys } from '../utils';

import { mockApi } from './api';

export const UUID_REGEX =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

/** Returns `arr` with all objects that're one level deep copied. */
export function copyObjArr<T extends Record<string, unknown> | n.Note>(arr: T[]): T[] {
  return arr.map((obj) => ({ ...obj }));
}

export function resetNoteStore(): void {
  n.noteState.notes = [];
  n.noteState.selectedNote = new n.Note();
  n.noteState.extraSelectedNotes = [];
}

export function resetSyncStore(): void {
  s.syncState.username = '';
  s.syncState.password = '';
  s.syncState.newPassword = '';
  s.syncState.isLoading = false;
  s.syncState.isLogin = true;
  s.syncState.isLoggedIn = false;
  s.syncState.unsyncedNoteIds.clear();

  s.resetAppError();
}

export function resetUpdateStore(): void {
  u.updateState.isAvailable = false;
  u.updateState.isDownloading = false;
  u.updateState.strategy = 'manual';
}

const formatTestId = (id: string) => `[data-test-id="${id}"]`;

export function getByTestId<T extends Node>(
  wrapper: VueWrapper<any> | Omit<DOMWrapper<Node>, 'exists'>, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string
): Omit<DOMWrapper<T>, 'exists'> {
  return wrapper.get<T>(formatTestId(id));
}

export function findByTestId<T extends Element>(
  wrapper: VueWrapper<any> | Omit<DOMWrapper<Node>, 'exists'>, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string
): DOMWrapper<T> {
  return wrapper.find<T>(formatTestId(id));
}

/** Returns a promise that resolves after `setImmediate`. */
export function resolveImmediate<T>(val?: T): Promise<T | void> {
  return new Promise((res) => {
    setImmediate(() => res(val));
  });
}

/** Waits until `cond` is `true`. */
export function waitUntil<T>(condFn: () => T): Promise<T> {
  return vi.waitUntil(condFn, { timeout: 10000 });
}

export function isNote(note: unknown): note is n.Note {
  const nt = note as n.Note;

  return (
    hasKeys(nt, ['id', 'timestamp', 'content']) &&
    typeof nt.id === 'string' &&
    typeof nt.timestamp === 'number' &&
    typeof nt.content === 'object' &&
    hasKeys(nt.content, ['delta', 'title', 'body']) &&
    typeof nt.content.delta === 'object' &&
    typeof nt.content.title === 'string' &&
    typeof nt.content.body === 'string'
  );
}

export function isEncryptedNote(note: unknown): note is EncryptedNote {
  const nt = note as EncryptedNote;

  if (typeof nt !== 'object' || typeof nt.content !== 'string') {
    return false;
  }

  return isNote({ ...nt, content: { delta: {}, title: '', body: '' } });
}

/**
 * @returns a `div` element with an `id` of `app`.
 */
export function getAppDiv() {
  const appDiv = document.createElement('div');

  appDiv.id = 'app';

  return appDiv;
}

/**
 * Returns options to be used when mounting a component that uses `Teleport`.
 *
 * @param appDiv use {@link getAppDiv}
 * @returns options to be passed to `mount`
 */
export function getTeleportMountOptions(appDiv: HTMLElement) {
  return {
    attachTo: appDiv,
    global: {
      stubs: { teleport: true },
    },
  };
}

/**
 * Asserts current `appError` against expected.
 * No `expectedErrorConfig` asserts a `NONE` error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertAppError<T extends (...args: any[]) => void>(
  expectedErrorConfig?: ErrorConfig<T>
) {
  const { appError } = s.syncState;

  if (!expectedErrorConfig && appError.isNone) {
    assert.hasAllDeepKeys(appError, new AppError());

    return;
  }

  if (!expectedErrorConfig) {
    assert.fail('Missing expectedErrorConfig');
  }

  if (expectedErrorConfig.message) {
    assert.strictEqual(appError.message, expectedErrorConfig.message);
  } else {
    assert.isNotEmpty(appError.message, expectedErrorConfig.message);
  }

  assert.strictEqual(appError.code, expectedErrorConfig.code);
  assert.strictEqual(appError.retryConfig?.fn, expectedErrorConfig.retry?.fn);
  assert.sameOrderedMembers(
    appError.retryConfig?.args || [],
    expectedErrorConfig.retry?.args || []
  );
  assert.deepEqual(appError.display, expectedErrorConfig.display);
}

/**
 * Asserts loading state is `false` before `cb`, `true` during, and `false` after.
 */
export async function assertLoadingState(cb: () => Promise<void>) {
  const { promises } = mockApi();

  assert.isFalse(s.syncState.isLoading);

  const cbPromise = cb();

  assert.isTrue(s.syncState.isLoading);

  await cbPromise;
  await Promise.all(promises);

  assert.isFalse(s.syncState.isLoading);
}
