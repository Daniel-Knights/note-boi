import { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { randomFillSync } from 'crypto';
import { nextTick } from 'vue';

import * as n from '../store/note';
import * as s from '../store/sync';

export const UUID_REGEX =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

/** Returns `arr` with all objects that're one level deep copied */
export function copyObjArr<T extends Record<string, unknown>>(arr: T[]): T[] {
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
  n.state.notes = [];
  n.state.selectedNote = new n.Note();
  n.state.extraSelectedNotes = [];
}

export function resetSyncStore(): void {
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  localStorage.removeItem('unsynced-note-ids');
  s.state.username = '';
  s.state.password = '';
  s.state.token = '';
  s.state.unsyncedNoteIds.clear();
  s.state.isLoading = false;
  s.state.isLogin = true;
  s.state.error = { type: s.ErrorType.None, message: '' };
}

const formatTestId = (id: string) => `[data-test-id="${id}"]`;

export function getByTestId<T extends Node>(
  wrapper: VueWrapper<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string
): Omit<DOMWrapper<T>, 'exists'> {
  return wrapper.get<T>(formatTestId(id));
}

export function findByTestId<T extends Element>(
  wrapper: VueWrapper<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string
): DOMWrapper<T> {
  return wrapper.find<T>(formatTestId(id));
}

/** Simulates awaiting a sync operation */
export function awaitSyncLoad(): Promise<void> | void {
  if (s.state.isLoading) {
    return nextTick().then(awaitSyncLoad);
  }
}

function hasProp<T>(obj: T, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function isNote(note: unknown): note is n.Note {
  const nt = note as n.Note;

  return (
    !!nt &&
    typeof nt === 'object' &&
    hasProp(nt, 'id') &&
    typeof nt.id === 'string' &&
    hasProp(nt, 'timestamp') &&
    typeof nt.timestamp === 'number' &&
    hasProp(nt, 'content') &&
    hasProp(nt.content, 'delta') &&
    typeof nt.content.delta === 'string' &&
    hasProp(nt.content, 'title') &&
    typeof nt.content.title === 'string' &&
    hasProp(nt.content, 'body') &&
    typeof nt.content.body === 'string'
  );
}
