import { clearMocks, mockWindows } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';
import { indexedDB } from 'fake-indexeddb';

import { KeyStore, Storage } from '../classes';

import { allCalls, mockKeyring } from './mock';
import { snapshotState } from './snapshot';
import { resetMockDb, resetNoteStore, resetSyncStore, resetUpdateStore } from './utils';

const assertFailSpy = vi.spyOn(assert, 'fail');

beforeAll(async () => {
  // JSDom doesn't come with `ResizeObserver`, IndexedDB, or `matchMedia` implementations
  // https://github.com/jsdom/jsdom/issues/3368 - Implement `ResizeObserver`
  // https://github.com/jsdom/jsdom/issues/1748 - Implement IndexedDB
  const MockResizeObserver = vi.fn(function () {
    return {
      observe() {
        // noop
      },
      disconnect() {
        // noop
      },
    };
  });

  Object.defineProperty(window, 'ResizeObserver', {
    value: MockResizeObserver,
  });
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
  });
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });

  // JSDom has no `scrollIntoView` implementation: https://github.com/jsdom/jsdom/issues/1695
  Element.prototype.scrollIntoView = vi.fn();

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
