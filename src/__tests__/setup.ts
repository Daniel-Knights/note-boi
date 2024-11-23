import { clearMocks, mockWindows } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';
import { indexedDB } from 'fake-indexeddb';
import crypto from 'node:crypto';

import * as s from '../store/sync';

import { mockDb } from './api';
import localNotes from './notes.json';
import { resetNoteStore, resetSyncStore, resetUpdateStore } from './utils';

const spyAssertFail = vi.spyOn(assert, 'fail');

const initialMockDb = structuredClone(mockDb);

beforeAll(async () => {
  // jsdom doesn't come with WebCrypto or IndexedDB implementations
  Object.defineProperty(window, 'crypto', {
    value: crypto,
  });
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
  });

  mockDb.encryptedNotes = await s.Encryptor.encryptNotes(localNotes, '1');

  await s.KeyStore.reset();

  mockWindows('main');
});

afterEach(async () => {
  resetSyncStore();
  resetNoteStore();
  resetUpdateStore();

  await s.KeyStore.reset();

  mockDb.users = structuredClone(initialMockDb.users);

  clearMocks();
  // Setting restoreMocks: true in global config doesn't seem to work
  vi.restoreAllMocks();
  localStorage.clear();

  document.body.innerHTML = '';

  expect(spyAssertFail).not.toHaveBeenCalled();
});

enableAutoUnmount(afterEach);
