import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { clearMockApiResults, mockApi } from '../../../api';

describe('Account', () => {
  describe('changePassword', () => {
    it('Changes password for currently logged in account', async () => {
      const { calls, events, promises } = mockApi();

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

      clearMockApiResults({ calls, events, promises });

      await s.changePassword();

      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/account/password/change'));
      assert.isNotEmpty(s.syncState.password);
      assert.isNotEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);

      s.syncState.password = '1';
      s.syncState.newPassword = '2';

      clearMockApiResults({ calls, events, promises });

      await s.changePassword();

      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/account/password/change'));
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(s.syncState.newPassword);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const { calls, events } = mockApi({
        request: {
          error: '/account/password/change',
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, events });

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
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/account/password/change'));
    });
  });

  describe('deleteAccount', () => {
    it('Deletes currently logged in account', async () => {
      const { calls, events, promises } = mockApi();

      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, events, promises });

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
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/account/delete'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('logout'));
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.isFalse(s.syncState.isLoading);
    });

    it('With server error', async () => {
      const { calls, events, promises } = mockApi({
        request: {
          error: '/account/delete',
        },
      });
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls, events, promises });

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');

      await s.deleteAccount();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/account/delete'));
      assert.strictEqual(events.emits.length, 0);
      expect(unsyncedClearSpy).not.toHaveBeenCalled();
      assert.isFalse(s.syncState.isLoading);
    });
  });
});
