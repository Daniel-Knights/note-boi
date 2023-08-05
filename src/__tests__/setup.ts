import { clearMocks } from '@tauri-apps/api/mocks';
import { enableAutoUnmount } from '@vue/test-utils';

import { resetRegisteredUsers } from './api';
import { resetNoteStore, resetSyncStore, setCrypto } from './utils';

const spyAssertFail = vi.spyOn(assert, 'fail');

beforeAll(() => {
  setCrypto();
});
afterEach(() => {
  resetSyncStore();
  resetNoteStore();
  resetRegisteredUsers();
  clearMocks();

  expect(spyAssertFail).not.toHaveBeenCalled();
});
enableAutoUnmount(afterEach);
