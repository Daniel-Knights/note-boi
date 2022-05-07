import { resetNoteStore, resetSyncStore, setCrypto } from '../utils';
import { mockTauriApi } from '../tauri';
import { isEmptyNote } from '../../utils';
import * as s from '../../store/sync';
import * as n from '../../store/note';
import localNotes from '../notes.json';

const mockEmits = {
  login: vi.fn(() => undefined),
  logout: vi.fn(() => undefined),
};

beforeAll(setCrypto);

afterEach(() => {
  resetSyncStore();
  resetNoteStore();
});

describe('Sync', () => {
  describe('setAutoSync', () => {
    it('Sets auto-sync preference to true', () => {
      s.setAutoSync(true);

      assert.isTrue(s.state.autoSyncEnabled);
      assert.strictEqual(localStorage.getItem('auto-sync'), 'true');
    });
    it('Sets auto-sync preference to false', () => {
      s.setAutoSync(false);

      assert.isFalse(s.state.autoSyncEnabled);
      assert.strictEqual(localStorage.getItem('auto-sync'), 'false');
    });
  });

  describe('login', () => {
    it('Logs in with no notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi([], mockEmits);

      await n.getAllNotes();

      assert.strictEqual(n.state.notes.length, 1);

      await s.login();

      assert.isFalse(s.state.isLoading);
      assert.strictEqual(n.state.notes.length, localNotes.length);
      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('Logs in with notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, mockEmits);

      await s.login();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('Fails to log in, with a server error', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, mockEmits, 500);

      await s.login();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.isEmpty(s.state.token);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.password, '1');
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(s.state.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.state.error.message);
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('With empty notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi([], mockEmits);

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('With notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, mockEmits);
      await n.getAllNotes();

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes);
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(undefined, mockEmits, 500);

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.isEmpty(s.state.token);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.password, '1');
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(s.state.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.state.error.message);
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      s.state.token = 'token';
      vi.clearAllMocks();
      mockTauriApi(undefined, mockEmits);
      await s.login();

      await s.logout();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(s.state.token);
      assert.isEmpty(s.state.username);
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.logout).toHaveBeenCalled();
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      s.state.token = 'token';
      vi.clearAllMocks();
      mockTauriApi();
      await s.login();
      mockTauriApi(undefined, mockEmits, 500);

      await s.logout();

      assert.isFalse(s.state.isLoading);
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.Logout);
      assert.isNotEmpty(s.state.error.message);
      expect(mockEmits.logout).not.toHaveBeenCalled();
    });
  });

  describe('pull', () => {
    it('Pulls notes from the server', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(localNotes);
      await s.login();

      await s.pull();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(localNotes, undefined, 500);

      await s.pull();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.Pull);
      assert.isNotEmpty(s.state.error.message);
    });

    it('User not found', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(localNotes);
      await s.login();
      mockTauriApi([], undefined, 404);

      await s.pull();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes);
      assert.isEmpty(s.state.username);
      assert.isEmpty(s.state.token);
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(s.state.error.type, s.ErrorType.Pull);
      assert.isNotEmpty(s.state.error.message);
    });
  });

  describe('push', () => {
    it('Pushes notes to the server', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      s.state.unsyncedNoteIds.add({ edited: ['note-id'] });
      mockTauriApi(localNotes);
      await s.login();

      await s.push();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes);
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(localNotes);
      await s.login();
      mockTauriApi([], undefined, 500);

      await s.push();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.Push);
      assert.isNotEmpty(s.state.error.message);
    });
  });
});
