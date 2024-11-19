import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { isEmptyNote } from '../../../../utils';
import { clearMockApiResults, mockApi, mockDb } from '../../../api';
import localNotes from '../../../notes.json';

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
    assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
    assert.strictEqual(calls.size, 1);
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

      assert.isFalse(s.syncState.isLoading);
      assert.lengthOf(n.noteState.notes, localNotes.length);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/login'));
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

      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/login'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
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

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '1');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/login'));
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
        await s.logout();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(fetchDataSpy).toHaveBeenCalledOnce();
    });
  });

  describe('signup', () => {
    it('With no notes', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'k');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/signup'));
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

      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'k');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/signup'));
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

      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(s.syncState.username, 'k');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'k');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/signup'));
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
            endpoint: '/signup',
          },
        },
      });

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/signup'));
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      const fetchDataSpy = vi.spyOn(s, 'fetchData');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      fetchDataSpy.mockRejectedValue(new Error('Mock reject'));

      s.syncState.username = 'd';
      s.syncState.password = '1';

      try {
        await s.signup();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(fetchDataSpy).toHaveBeenCalledOnce();
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

      assert.isFalse(s.syncState.isLoading);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/logout'));
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

      assert.isFalse(s.syncState.isLoading);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/logout'));
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
        await s.logout();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(fetchDataSpy).toHaveBeenCalledOnce();
    });
  });
});
