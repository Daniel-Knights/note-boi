import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { isEmptyNote } from '../../../../utils';
import { clearMockApiResults, mockApi } from '../../../api';
import localNotes from '../../../notes.json';

describe('Sync', () => {
  describe('login', () => {
    it('With no notes', async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      assert.strictEqual(n.noteState.notes.length, 0);

      await s.login();

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(n.noteState.notes.length, localNotes.length);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 3);
      assert.isTrue(calls.has('/login'));
      assert.isTrue(calls.has('/notes'));
      assert.isTrue(calls.has('sync_local_notes'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('login'));
    });

    it('With notes', async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      assert.isAbove(n.noteState.notes.length, 1);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('get_all_notes'));

      clearMockApiResults({ calls, events });

      await s.login();

      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 3);
      assert.isTrue(calls.has('/login'));
      assert.isTrue(calls.has('/notes'));
      assert.isTrue(calls.has('sync_local_notes'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('login'));
    });

    it('Fails to log in, with a server error', async () => {
      const { calls, events } = mockApi({
        request: {
          error: '/login',
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.isEmpty(s.syncState.token);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '1');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/login'));
      assert.strictEqual(events.emits.length, 0);
    });
  });

  describe('signup', () => {
    it('With no notes', async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'k');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/signup'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('login'));
    });

    it('With notes', async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await n.getAllNotes();

      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      clearMockApiResults({ calls, events });

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'k');
      assert.isEmpty(s.syncState.password);
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'k');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/signup'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('login'));
    });

    it("Doesn't push empty notes", async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      n.newNote();

      assert.isNotEmpty(n.noteState.notes);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      clearMockApiResults({ calls, events });

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'k');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/signup'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('login'));
    });

    it('With server error', async () => {
      const { calls, events } = mockApi({
        request: {
          error: '/signup',
        },
      });

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.isEmpty(s.syncState.token);
      assert.strictEqual(s.syncState.username, 'k');
      assert.strictEqual(s.syncState.password, '2');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/signup'));
      assert.strictEqual(events.emits.length, 0);
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';
      s.syncState.token = 'token';

      await s.login();

      clearMockApiResults({ calls, events });

      await s.logout();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(s.syncState.token);
      assert.isEmpty(s.syncState.username);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/logout'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('logout'));
    });

    it('With server error', async () => {
      const { calls, events } = mockApi({
        request: {
          error: '/logout',
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      clearMockApiResults({ calls, events });

      await s.logout();

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Logout);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/logout'));
      assert.strictEqual(events.emits.length, 0);
    });
  });
});
