import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { clearMockApiResults, mockApi, mockDb } from '../../../api';

describe('Account', () => {
  describe('changePassword', () => {
    it('Changes password for currently logged in account', async () => {
      const { calls, promises } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(s.syncState.newPassword);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      clearMockApiResults({ calls, promises });

      await s.changePassword();

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
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
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);
      assert.isEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/account/password/change',
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      await s.changePassword();

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/account/password/change'));
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      delete mockDb.users.k; // Deleted from different device, for example

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      await s.changePassword();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const fetchDataSpy = vi.spyOn(s, 'fetchData');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      fetchDataSpy.mockRejectedValue(new Error('Mock reject'));

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      try {
        await s.changePassword();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(fetchDataSpy).toHaveBeenCalledOnce();
    });
  });

  describe('deleteAccount', () => {
    it('Deletes currently logged in account', async () => {
      const { calls, promises } = mockApi();

      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');
      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');

      await s.deleteAccount();

      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);
      assert.isEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
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
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const { calls, promises } = mockApi({
        request: {
          error: {
            endpoint: '/account/delete',
          },
        },
      });
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isFalse(s.syncState.isLoading);
    });

    it('User unauthorised', async () => {
      const { calls, promises } = mockApi({
        request: {
          error: {
            endpoint: '/account/delete',
            status: 401,
          },
        },
      });
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');
      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();
      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('User not found', async () => {
      const { calls, promises } = mockApi();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');
      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      delete mockDb.users.k; // Deleted from different device, for example

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();
      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const fetchDataSpy = vi.spyOn(s, 'fetchData');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      fetchDataSpy.mockRejectedValue(new Error('Mock reject'));

      try {
        await s.deleteAccount();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(fetchDataSpy).toHaveBeenCalledOnce();
    });
  });
});
