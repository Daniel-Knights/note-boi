import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { ERROR_CODE, Storage } from '../../../../classes';
import { clearMockApiResults, mockApi, mockDb } from '../../../api';
import { assertAppError, assertLoadingState } from '../../../utils';

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
      assert.strictEqual(Storage.get('USERNAME'), 'd');

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      clearMockApiResults({ calls, promises });

      await s.changePassword();

      assertAppError({
        code: ERROR_CODE.CHANGE_PASSWORD,
        retry: { fn: s.changePassword },
        display: { form: true, sync: true },
      });

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.loadingCount, 0);

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      clearMockApiResults({ calls, promises });

      await s.changePassword();

      assertAppError();
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(s.syncState.newPassword);
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.loadingCount, 0);
    });

    it('With encryptor error', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls });

      await s.changePassword();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: s.changePassword },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: '' });
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

      assertAppError({
        code: ERROR_CODE.CHANGE_PASSWORD,
        retry: { fn: s.changePassword },
        display: { form: true, sync: true },
      });

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      delete mockDb.users.k; // Deleted from different device, for example

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      await s.changePassword();

      assertAppError({
        code: ERROR_CODE.CHANGE_PASSWORD,
        retry: { fn: s.changePassword },
        display: { form: true, sync: true },
      });

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/password/change'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(async () => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        await s.login();

        s.syncState.password = '1';
        s.syncState.newPassword = '2';

        return s.changePassword();
      });
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
      assert.strictEqual(Storage.get('USERNAME'), 'd');

      await s.deleteAccount();

      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 5);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'd' });
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
      assert.strictEqual(s.syncState.loadingCount, 0);
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
      assert.strictEqual(Storage.get('USERNAME'), 'd');

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.DELETE_ACCOUNT,
        retry: { fn: s.deleteAccount },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(Storage.get('USERNAME'), 'd');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.strictEqual(s.syncState.loadingCount, 0);
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

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.DELETE_ACCOUNT,
        retry: { fn: s.deleteAccount },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User not found', async () => {
      const { calls, promises } = mockApi();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      delete mockDb.users.k; // Deleted from different device, for example

      await s.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.DELETE_ACCOUNT,
        retry: { fn: s.deleteAccount },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(async () => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        await s.login();

        return s.deleteAccount();
      });
    });
  });
});
