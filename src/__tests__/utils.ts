import { DOMWrapper, VueWrapper } from '@vue/test-utils';

import * as n from '../store/note';
import * as s from '../store/sync';
import { STORAGE_KEYS } from '../constant';
import { EncryptedNote } from '../store/sync/encryptor';
import { hasKeys } from '../utils';

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
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.UNSYNCED);

  s.syncState.username = '';
  s.syncState.password = '';
  s.syncState.newPassword = '';
  s.syncState.token = '';
  s.syncState.isLoading = false;
  s.syncState.isLogin = true;
  s.syncState.unsyncedNoteIds.clear();

  s.resetError();
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

/** Simulates awaiting a sync operation. */
export function awaitSyncLoad(callCount = 0): Promise<void> | void {
  // A lower limit will work with tests in isolation, but not with all tests running concurrently
  if (callCount === 1000000) {
    assert.fail('`awaitSyncLoad` call limit exceeded');
  }

  if (s.syncState.isLoading) {
    return new Promise((res, rej) => {
      // We use `setImmediate` as `nextTick` can cause fake-indexeddb requests to hang
      setImmediate(async () => {
        try {
          await awaitSyncLoad(callCount + 1);
        } catch (err) {
          rej(err);
        }

        res();
      });
    });
  }
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
