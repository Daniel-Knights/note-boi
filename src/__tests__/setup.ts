import { clearMocks } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';
import { indexedDB } from 'fake-indexeddb';
import crypto from 'node:crypto';

import * as s from '../store/sync';

import { mockDb } from './api';
import localNotes from './notes.json';
import { resetNoteStore, resetSyncStore } from './utils';

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
});

afterEach(async () => {
  resetSyncStore();
  resetNoteStore();

  await s.KeyStore.reset();

  mockDb.users = structuredClone(initialMockDb.users);

  clearMocks();
  // Setting restoreMocks: true in global config doesn't seem to work
  vi.restoreAllMocks();
  localStorage.clear();

  expect(spyAssertFail).not.toHaveBeenCalled();
});

enableAutoUnmount(afterEach);
