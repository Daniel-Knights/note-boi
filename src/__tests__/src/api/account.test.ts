import * as a from '../../../api';
import * as auth from '../../../api/auth';
import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { ERROR_CODE, Storage } from '../../../classes';
import { tauriInvoke } from '../../../utils';
import { clearMockApiResults, mockApi, mockDb } from '../../mock';
import {
  assertAppError,
  assertLoadingState,
  assertRequest,
  hackEncryptionError,
} from '../../utils';

describe('Account', () => {
  describe('changePassword', () => {
    it('Changes password for currently logged in account', async () => {
      const { calls, promises } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      vi.clearAllMocks();

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(s.syncState.newPassword);
      assert.strictEqual(Storage.get('USERNAME'), 'd');

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      clearMockApiResults({ calls, promises });

      await a.changePassword();

      assertAppError({
        code: ERROR_CODE.CHANGE_PASSWORD,
        message: 'Unauthorized',
        retry: { fn: a.changePassword },
        display: { form: true, sync: true },
      });

      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/change-password'));
      assertRequest('/account/change-password', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.loadingCount, 0);

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      clearMockApiResults({ calls, promises });

      await a.changePassword();

      assertAppError();
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/account/change-password'));
      assertRequest('/account/change-password', calls.request[0]!.calledWith!);
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

    it('With encryption error', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();
      await n.getAllNotes();

      clearMockApiResults({ calls });
      hackEncryptionError(n.noteState.notes[0]!);

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      await a.changePassword();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: a.changePassword },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('With server error', async () => {
      const { calls, setErrorValue } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls });
      setErrorValue.request({
        endpoint: '/account/change-password',
        status: 500,
      });

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      await a.changePassword();

      assertAppError({
        code: ERROR_CODE.CHANGE_PASSWORD,
        message: 'Server error',
        retry: { fn: a.changePassword },
        display: { form: true, sync: true },
      });

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/change-password'));
      assertRequest('/account/change-password', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await a.signup();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      delete mockDb.users.k; // Deleted from different device, for example

      s.syncState.password = '2';
      s.syncState.newPassword = '1';

      await a.changePassword();

      assertAppError({
        code: ERROR_CODE.CHANGE_PASSWORD,
        message: 'User not found',
        retry: { fn: a.changePassword },
        display: { form: true, sync: true },
      });

      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/account/change-password'));
      assertRequest('/account/change-password', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
    });

    it('Logs out client-side if no username', async () => {
      const { calls } = mockApi();
      const clientSideLogoutSpy = vi.spyOn(auth, 'clientSideLogout');

      clearMockApiResults({ calls });

      await a.changePassword();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Logs out client-side if no access token', async () => {
      const { calls } = mockApi();
      const clientSideLogoutSpy = vi.spyOn(auth, 'clientSideLogout');

      s.syncState.username = 'd';
      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      await a.login();
      await tauriInvoke('delete_access_token', { username: 'd' });

      clearMockApiResults({ calls });

      await a.changePassword();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 3);
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

    it('Sets and resets loading state', () => {
      return assertLoadingState(async () => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        await a.login();

        s.syncState.password = '1';
        s.syncState.newPassword = '2';

        return a.changePassword();
      });
    });
  });

  describe('deleteAccount', () => {
    it('Deletes currently logged in account', async () => {
      const { calls, promises } = mockApi();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNotes, 'clear');
      // `clientSideLogout` is imported directly in `account.ts`, so spying on the re-export
      // doesn't work. Need to spy on it directly from `auth.ts`
      const clientSideLogoutSpy = vi.spyOn(auth, 'clientSideLogout');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(Storage.get('USERNAME'), 'd');

      await a.deleteAccount();

      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 5);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        title: 'Delete account',
        kind: 'warning',
        message: 'Are you sure?',
      });
      assert.isTrue(calls.request.has('/account/delete'));
      assertRequest('/account/delete', calls.request[0]!.calledWith!);
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
      const { calls, setResValues } = mockApi();

      setResValues.tauriApi({ askDialog: [false] });

      s.syncState.username = 'd';

      await a.deleteAccount();

      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.strictEqual(s.syncState.loadingCount, 0);
    });

    it('With server error', async () => {
      const { calls, promises, setErrorValue } = mockApi();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNotes, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });
      setErrorValue.request({ endpoint: '/account/delete' });

      await a.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.DELETE_ACCOUNT,
        message: 'Server error',
        retry: { fn: a.deleteAccount },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(Storage.get('USERNAME'), 'd');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assertRequest('/account/delete', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.strictEqual(s.syncState.loadingCount, 0);
    });

    it('Unauthorized', async () => {
      const { calls, promises, setErrorValue } = mockApi();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNotes, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });
      setErrorValue.request({ endpoint: '/account/delete', status: 401 });

      await a.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.DELETE_ACCOUNT,
        message: 'Unauthorized',
        retry: { fn: a.deleteAccount },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assertRequest('/account/delete', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User not found', async () => {
      const { calls, promises } = mockApi();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNotes, 'clear');

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await a.signup();

      vi.clearAllMocks();
      clearMockApiResults({ calls, promises });

      delete mockDb.users.k; // Deleted from different device, for example

      await a.deleteAccount();

      expect(unsyncedClearSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.DELETE_ACCOUNT,
        message: 'User not found',
        retry: { fn: a.deleteAccount },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assertRequest('/account/delete', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
    });

    it('Logs out client-side if no username', async () => {
      const { calls } = mockApi();

      clearMockApiResults({ calls });

      await a.deleteAccount();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Logs out client-side if no access token', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();
      await tauriInvoke('delete_access_token', { username: 'd' });

      clearMockApiResults({ calls });

      await a.deleteAccount();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
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

    it('Sets and resets loading state', () => {
      return assertLoadingState(async () => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        await a.login();

        return a.deleteAccount();
      });
    });
  });
});
