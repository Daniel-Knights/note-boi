import * as s from '../../../store/sync';
import { STORAGE_KEYS } from '../../../constant';
import { mockTauriApi } from '../../tauri';
import { resetNoteStore, resetSyncStore, setCrypto } from '../../utils';

beforeAll(setCrypto);

afterEach(() => {
  resetSyncStore();
  resetNoteStore();
});

describe('Account', () => {
  describe('deleteAccount', () => {
    it('Deletes currently logged in account', async () => {
      const mockLogout = vi.fn();
      const unsyncedClearSpy = vi.spyOn(s.state.unsyncedNoteIds, 'clear');
      mockTauriApi([], { mockFns: { logout: mockLogout } });
      s.state.username = 'd';
      s.state.password = '1';
      await s.login();
      vi.resetAllMocks();
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      await s.deleteAccount();

      assert.isEmpty(s.state.username);
      assert.isEmpty(s.state.token);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockLogout).toHaveBeenCalledOnce();
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.isFalse(s.state.isLoading);
    });

    it('With server error', async () => {
      const mockLogout = vi.fn();
      const unsyncedClearSpy = vi.spyOn(s.state.unsyncedNoteIds, 'clear');
      s.state.username = 'd';
      s.state.password = '1';
      await s.login();
      vi.resetAllMocks();
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      mockTauriApi([], { httpStatus: 500, mockFns: { logout: mockLogout } });

      await s.deleteAccount();

      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.state.error.message);
      expect(mockLogout).not.toHaveBeenCalled();
      expect(unsyncedClearSpy).not.toHaveBeenCalled();
      assert.isFalse(s.state.isLoading);
    });
  });
});
