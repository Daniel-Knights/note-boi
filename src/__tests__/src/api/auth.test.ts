import * as a from '../../../api';
import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { ERROR_CODE, Storage } from '../../../classes';
import { isEmptyNote } from '../../../utils';
import { clearMockApiResults, mockApi, mockDb, mockKeyring } from '../../mock';
import {
  assertAppError,
  assertLoadingState,
  assertRequest,
  getDummyNotes,
  getEncryptedNotes,
  hackEncryptionError,
} from '../../utils';

describe('Auth', () => {
  it('clientSideLogout', async () => {
    const { calls } = mockApi();
    s.syncState.username = 'd';
    s.syncState.password = '1';

    await a.login();

    clearMockApiResults({ calls });

    a.clientSideLogout();

    assert.isEmpty(s.syncState.username);
    assert.isFalse(s.syncState.isLoggedIn);
    assert.isNull(Storage.get('USERNAME'));
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.invoke.has('delete_access_token'));
    assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    assert.isTrue(calls.emits.has('auth'));
    assert.deepEqual(calls.emits[0]!.calledWith, {
      isFrontendEmit: true,
      data: {
        is_logged_in: false,
      },
    });
  });

  describe('login', () => {
    it('With no notes', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      assert.lengthOf(n.noteState.notes, 0);

      mockDb.encryptedNotes = getEncryptedNotes();

      await a.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.lengthOf(n.noteState.notes, getDummyNotes().length);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'd');
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/auth/login'));
      assertRequest('/auth/login', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With notes', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      assert.isAbove(n.noteState.notes.length, 1);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_all_notes'));

      clearMockApiResults({ calls });

      await a.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.deepEqual(n.noteState.notes, getDummyNotes().sort(n.sortNotesFn));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'd');
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/auth/login'));
      assertRequest('/auth/login', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With encryption error', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      clearMockApiResults({ calls });
      hackEncryptionError(n.noteState.notes[0]!);

      await a.login();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: a.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 0);
    });

    it('With decryption error', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      clearMockApiResults({ calls });

      mockDb.encryptedNotes = [{ id: '', timestamp: 0, content: 'Un-deserialisable' }];

      await a.login();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: a.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/auth/login'));
      assertRequest('/auth/login', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With server error', async () => {
      const { calls, setErrorValue } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      setErrorValue.request({ endpoint: '/auth/login' });

      await a.login();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'Server error',
        retry: { fn: a.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '1');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/auth/login'));
      assertRequest('/auth/login', calls.request[0]!.calledWith!);
    });

    it('Unauthorized', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '2';

      await a.login();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'Unauthorized',
        retry: { fn: a.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/auth/login'));
      assertRequest('/auth/login', calls.request[0]!.calledWith!);
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await a.login();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'User not found',
        retry: { fn: a.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/auth/login'));
      assertRequest('/auth/login', calls.request[0]!.calledWith!);
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(() => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        return a.login();
      });
    });
  });

  describe('signup', () => {
    it('With no notes', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await a.signup();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'k');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/auth/signup'));
      assertRequest('/auth/signup', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'k',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With notes', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await n.getAllNotes();

      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNotes, 'clear');

      clearMockApiResults({ calls });

      await a.signup();

      expect(unsyncedClearSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.deepEqual(n.noteState.notes, getDummyNotes().sort(n.sortNotesFn));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'k');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/auth/signup'));
      assertRequest('/auth/signup', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'k',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With encryption error', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls });
      hackEncryptionError(n.noteState.notes[0]!);

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await a.signup();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: a.signup },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 0);
    });

    it('With server error', async () => {
      const { calls, setErrorValue } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      setErrorValue.request({ endpoint: '/auth/signup' });

      await a.signup();

      assertAppError({
        code: ERROR_CODE.SIGNUP,
        message: 'Server error',
        retry: { fn: a.signup },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/auth/signup'));
      assertRequest('/auth/signup', calls.request[0]!.calledWith!);
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(() => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        return a.signup();
      });
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';
      s.syncState.isLoggedIn = true;

      await a.login();

      clearMockApiResults({ calls });

      await a.logout();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/auth/logout'));
      assertRequest('/auth/logout', calls.request[0]!.calledWith!);
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

    it('With server error', async () => {
      const { calls, setErrorValue } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      clearMockApiResults({ calls });
      setErrorValue.request({ endpoint: '/auth/logout' });

      await a.logout();

      assertAppError({
        code: ERROR_CODE.LOGOUT,
        message: 'Server error',
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/auth/logout'));
      assertRequest('/auth/logout', calls.request[0]!.calledWith!);
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

    it('Unauthorized', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      clearMockApiResults({ calls });

      delete mockKeyring.d;

      await a.logout();

      assertAppError({
        code: ERROR_CODE.LOGOUT,
        message: 'Unauthorized',
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/auth/logout'));
      assertRequest('/auth/logout', calls.request[0]!.calledWith!);
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

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      clearMockApiResults({ calls });

      delete mockDb.users.d;

      await a.logout();

      assertAppError({
        code: ERROR_CODE.LOGOUT,
        message: 'User not found',
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/auth/logout'));
      assertRequest('/auth/logout', calls.request[0]!.calledWith!);
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

        return a.logout();
      });
    });
  });
});
