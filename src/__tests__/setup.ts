import { enableAutoUnmount } from '@vue/test-utils';

import { resetNoteStore, resetSyncStore, setCrypto } from './utils';

beforeAll(() => {
  setCrypto();
});
afterEach(() => {
  resetSyncStore();
  resetNoteStore();
});
enableAutoUnmount(afterEach);
