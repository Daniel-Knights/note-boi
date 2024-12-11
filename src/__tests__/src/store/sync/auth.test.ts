import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { ERROR_CODE, Storage } from '../../../../classes';
import { isEmptyNote } from '../../../../utils';
import { clearMockApiResults, mockApi, mockDb, mockKeyring } from '../../../api';
import localNotes from '../../../notes.json';
import { assertAppError, assertLoadingState } from '../../../utils';

describe('Auth', () => {
  it('clientSideLogout', async () => {
    const { calls } = mockApi();
    s.syncState.username = 'd';
    s.syncState.password = '1';

    await s.login();

    clearMockApiResults({ calls });

    s.clientSideLogout();

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
      const { calls } = mockApi({
        request: {
          resValue: {
            '/login': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      assert.lengthOf(n.noteState.notes, 0);

      await s.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.lengthOf(n.noteState.notes, localNotes.length);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'd');
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/login'));
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
      const { calls } = mockApi({
        request: {
          resValue: {
            '/login': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      assert.isAbove(n.noteState.notes.length, 1);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_all_notes'));

      clearMockApiResults({ calls });

      await s.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'd');
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/login'));
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

    it('With encryptor error', async () => {
      const { calls } = mockApi({
        request: {
          resValue: {
            '/login': [
              { notes: [{ id: '0', timestamp: 0, content: 'Unencrypted content' }] },
            ],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: s.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/login'));
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
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/login',
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'Server error',
        retry: { fn: s.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '1');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/login'));
    });

    it('Unauthorized', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '2';

      await s.login();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'Unauthorized',
        retry: { fn: s.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/login'));
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.login();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'User not found',
        retry: { fn: s.login },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/login'));
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(() => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        return s.login();
      });
    });
  });

  describe('signup', () => {
    it('With no notes', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'k');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/signup'));
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

      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      clearMockApiResults({ calls });

      await s.signup();

      expect(unsyncedClearSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(Storage.get('USERNAME'), 'k');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/signup'));
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

    it("Doesn't push empty notes", async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      n.newNote();

      assert.isNotEmpty(n.noteState.notes);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      clearMockApiResults({ calls });

      await s.signup();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(s.syncState.username, 'k');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(Storage.get('USERNAME'), 'k');
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/signup'));
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

    it('With encryptor error', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      clearMockApiResults({ calls });

      await s.signup();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: s.signup },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 0);
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/signup',
          },
        },
      });

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      assertAppError({
        code: ERROR_CODE.SIGNUP,
        message: 'Server error',
        retry: { fn: s.signup },
        display: { form: true, sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/signup'));
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(() => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        return s.signup();
      });
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';
      s.syncState.isLoggedIn = true;

      await s.login();

      clearMockApiResults({ calls });

      await s.logout();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/logout'));
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
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/logout',
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      clearMockApiResults({ calls });

      await s.logout();

      assertAppError({
        code: ERROR_CODE.LOGOUT,
        message: 'Server error',
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/logout'));
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

      await s.login();

      clearMockApiResults({ calls });

      delete mockKeyring.d;

      await s.logout();

      assertAppError({
        code: ERROR_CODE.LOGOUT,
        message: 'Unauthorized',
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/logout'));
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

      await s.login();

      clearMockApiResults({ calls });

      delete mockDb.users.d;

      await s.logout();

      assertAppError({
        code: ERROR_CODE.LOGOUT,
        message: 'User not found',
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/logout'));
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

        await s.login();

        return s.logout();
      });
    });
  });
});
