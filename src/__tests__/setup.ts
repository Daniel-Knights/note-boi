import { clearMocks, mockWindows } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';
import { indexedDB } from 'fake-indexeddb';
import crypto from 'node:crypto';

import * as s from '../store/sync';
import { storage } from '../storage';

import { allCalls, mockDb } from './api';
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

  mockDb.encryptedNotes = await s.Encryptor.encryptNotes(localNotes, '1');

  await s.KeyStore.reset();

  mockWindows('main');
});

afterEach(async () => {
  await snapshotState();

  allCalls.splice(0, allCalls.length);

  resetSyncStore();
  resetNoteStore();
  resetUpdateStore();

  await s.KeyStore.reset();

  mockDb.users = structuredClone(initialMockDb.users);

  clearMocks();

  storage.clear();
  document.body.innerHTML = '';

  expect(assertFailSpy).not.toHaveBeenCalled();
});

enableAutoUnmount(afterEach);
