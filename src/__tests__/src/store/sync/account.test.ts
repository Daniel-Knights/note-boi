import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { clearMockApiResults, mockApi } from '../../../api';

describe('Account', () => {
  describe('changePassword', () => {
    it('Changes password for currently logged in account', async () => {
      const { calls, promises } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(s.syncState.newPassword);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      clearMockApiResults({ calls, promises });

      await s.changePassword();

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      clearMockApiResults({ calls, promises });

      await s.changePassword();

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: '/account/password/change',
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      await s.changePassword();

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/account/password/change'));
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const tauriFetchSpy = vi.spyOn(s, 'tauriFetch');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      tauriFetchSpy.mockRejectedValue(new Error('Mock reject'));

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      try {
        await s.changePassword();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(tauriFetchSpy).toHaveBeenCalledOnce();
    });
  });

  describe('deleteAccount', () => {
    it('Deletes currently logged in account', async () => {
      const { calls, promises } = mockApi();

      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      await s.deleteAccount();

      expect(unsyncedClearSpy).toHaveBeenCalledOnce();

      assert.isEmpty(s.syncState.username);
      assert.isEmpty(s.syncState.token);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('askDialog'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.emits.has('logout'));
      assert.isFalse(s.syncState.isLoading);
    });

    it('Returns if ask dialog returns false', async () => {
      const { calls } = mockApi({
        tauriApi: {
          resValue: {
            askDialog: [false],
          },
        },
      });

      await s.deleteAccount();

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('askDialog'));
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const { calls, promises } = mockApi({
        request: {
          error: '/account/delete',
        },
      });
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('askDialog'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isFalse(s.syncState.isLoading);
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const tauriFetchSpy = vi.spyOn(s, 'tauriFetch');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      tauriFetchSpy.mockRejectedValue(new Error('Mock reject'));

      try {
        await s.deleteAccount();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(tauriFetchSpy).toHaveBeenCalledOnce();
    });
  });
});
