import { enableAutoUnmount } from '@vue/test-utils';

import { resetNoteStore, resetSyncStore, setCrypto } from './utils';

const spyAssertFail = vi.spyOn(assert, 'fail');

beforeAll(() => {
  setCrypto();
});
afterEach(() => {
  resetSyncStore();
  resetNoteStore();

  expect(spyAssertFail).not.toHaveBeenCalled();
});
enableAutoUnmount(afterEach);
