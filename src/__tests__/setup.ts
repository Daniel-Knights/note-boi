import { clearMocks, mockWindows } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';
import { indexedDB } from 'fake-indexeddb';
import crypto from 'node:crypto';

import { Encryptor, KeyStore, Storage } from '../classes';

import { allCalls, mockDb, mockKeyring } from './api';
import localNotes from './notes.json';
import { snapshotState } from './snapshot';
import { resetNoteStore, resetSyncStore, resetUpdateStore } from './utils';

const assertFailSpy = vi.spyOn(assert, 'fail');

const initialMockDb = structuredClone(mockDb);

beforeAll(async () => {
  // jsdom doesn't come with WebCrypto or IndexedDB implementations
  Object.defineProperty(window, 'crypto', {
    value: crypto,
  });
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
  });

  mockDb.encryptedNotes = await Encryptor.encryptNotes(localNotes, '1');

  await KeyStore.reset();

  mockWindows('main');
});

afterEach(async () => {
  await snapshotState();

  allCalls.splice(0, allCalls.length);

  resetSyncStore();
  resetNoteStore();
  resetUpdateStore();

  await KeyStore.reset();

  mockDb.users = structuredClone(initialMockDb.users);

  Object.keys(mockKeyring).forEach((key) => {
    delete mockKeyring[key];
  });

  clearMocks();
  Storage.clear();

  document.body.innerHTML = '';

  expect(assertFailSpy).not.toHaveBeenCalled();
});

enableAutoUnmount(afterEach);
