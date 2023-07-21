import { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { randomFillSync } from 'crypto';
import { nextTick } from 'vue';

import * as n from '../store/note';
import * as s from '../store/sync';
import { STORAGE_KEYS } from '../constant';

export const UUID_REGEX =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

/** Returns `arr` with all objects that're one level deep copied. */
export function copyObjArr<T extends Record<string, unknown> | n.Note>(arr: T[]): T[] {
  return arr.map((obj) => ({ ...obj }));
}

// jsdom doesn't come with a WebCrypto implementation
export function setCrypto(): void {
  window.crypto = {
    // @ts-expect-error strict typing unnecessary here
    getRandomValues: (array) => randomFillSync(array),
  };
}

export function mockPromise<T>(resValue?: T): Promise<T | void> {
  return new Promise((res) => {
    res(resValue);
  });
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
  s.syncState.unsyncedNoteIds.clear();
  s.syncState.isLoading = false;
  s.syncState.isLogin = true;
  s.syncState.error = { type: s.ErrorType.None, message: '' };
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
export function awaitSyncLoad(): Promise<void> | void {
  if (s.syncState.isLoading) {
    return nextTick().then(awaitSyncLoad);
  }
}

export function isNote(note: unknown): note is n.Note {
  const nt = note as n.Note;

  return (
    !!nt &&
    typeof nt === 'object' &&
    'id' in nt &&
    typeof nt.id === 'string' &&
    'timestamp' in nt &&
    typeof nt.timestamp === 'number' &&
    'content' in nt &&
    'delta' in nt.content &&
    typeof nt.content.delta === 'object' &&
    'title' in nt.content &&
    typeof nt.content.title === 'string' &&
    'body' in nt.content &&
    typeof nt.content.body === 'string'
  );
}
