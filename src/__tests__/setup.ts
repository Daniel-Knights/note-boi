import { clearMocks, mockWindows } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';
import { indexedDB } from 'fake-indexeddb';

import { KeyStore, Storage } from '../classes';

import { allCalls, mockKeyring } from './mock';
import { snapshotState } from './snapshot';
import { resetMockDb, resetNoteStore, resetSyncStore, resetUpdateStore } from './utils';

const assertFailSpy = vi.spyOn(assert, 'fail');

beforeAll(async () => {
  // jsdom doesn't come with IndexedDB implementations
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
  });

  await KeyStore.reset();

  mockWindows('main');
});

afterEach(async () => {
  await snapshotState();

  allCalls.splice(0, allCalls.length);

  resetSyncStore();
  resetNoteStore();
  resetUpdateStore();
  resetMockDb();

  await KeyStore.reset();

  Object.keys(mockKeyring).forEach((key) => {
    delete mockKeyring[key];
  });

  clearMocks();
  Storage.clear();

  document.body.innerHTML = '';

  expect(assertFailSpy).not.toHaveBeenCalled();
});

enableAutoUnmount(afterEach);
