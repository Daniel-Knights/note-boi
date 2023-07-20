import * as s from '../../../store/sync';
import { STORAGE_KEYS } from '../../../constant';
import { mockTauriApi } from '../../tauri';

describe('Account', () => {
  describe('deleteAccount', () => {
    it('Deletes currently logged in account', async () => {
      const mockLogout = vi.fn();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');
      mockTauriApi([], { mockFns: { logout: mockLogout } });
      s.syncState.username = 'd';
      s.syncState.password = '1';
      await s.login();
      vi.clearAllMocks();
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      await s.deleteAccount();

      assert.isEmpty(s.syncState.username);
      assert.isEmpty(s.syncState.token);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      expect(mockLogout).toHaveBeenCalledOnce();
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const mockLogout = vi.fn();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');
      s.syncState.username = 'd';
      s.syncState.password = '1';
      await s.login();
      vi.clearAllMocks();
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      mockTauriApi([], { httpStatus: 500, mockFns: { logout: mockLogout } });

      await s.deleteAccount();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      expect(mockLogout).not.toHaveBeenCalled();
      expect(unsyncedClearSpy).not.toHaveBeenCalled();
      assert.isFalse(s.syncState.isLoading);
    });
  });
});
