import { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { randomFillSync } from 'crypto';
import { nextTick } from 'vue';

import * as n from '../store/note';
import * as s from '../store/sync';

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
  localStorage.removeItem('auto-sync');
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  s.state.username = '';
  s.state.password = '';
  s.state.token = '';
  s.state.unsyncedNoteIds.clear();
  s.state.isLoading = false;
  s.state.isLogin = true;
  s.state.autoSyncEnabled = true;
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
