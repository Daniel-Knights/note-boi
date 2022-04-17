import { assert, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetNoteStore, setCrypto } from '../utils';
import { isEmptyNote } from '../../utils';
import { mockTauriApi } from '../tauri';
import * as syncStore from '../../store/sync';
import * as noteStore from '../../store/note';
import localNotes from '../notes.json';

const mockEmits = {
  login: vi.fn(() => undefined),
  logout: vi.fn(() => undefined),
};

beforeAll(setCrypto);

beforeEach(() => {
  localStorage.removeItem('auto-sync');
  localStorage.removeItem('username');
  localStorage.removeItem('token');
  syncStore.state.username = '';
  syncStore.state.password = '';
  syncStore.state.token = '';
  syncStore.state.hasUnsyncedNotes = false;
  syncStore.state.isLoading = false;
  syncStore.state.isLogin = true;
  syncStore.state.autoSyncEnabled = true;
  syncStore.state.error = { type: syncStore.ErrorType.None, message: '' };
  resetNoteStore();
});

describe('Sync', () => {
  describe('setAutoSync', () => {
    it('Sets auto-sync preference to true', () => {
      syncStore.setAutoSync(true);

      assert.isTrue(syncStore.state.autoSyncEnabled);
      assert.strictEqual(localStorage.getItem('auto-sync'), 'true');
    });
    it('Sets auto-sync preference to false', () => {
      syncStore.setAutoSync(false);

      assert.isFalse(syncStore.state.autoSyncEnabled);
      assert.strictEqual(localStorage.getItem('auto-sync'), 'false');
    });
  });

  describe('login', () => {
    it('Logs in with no notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi([], mockEmits);

      await syncStore.login();

      assert.isFalse(syncStore.state.isLoading);
      assert.strictEqual(noteStore.state.notes.length, 1);
      assert.isTrue(isEmptyNote(noteStore.state.notes[0]));
      assert.isTrue(isEmptyNote(noteStore.state.selectedNote));
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.username, 'd');
      assert.isEmpty(syncStore.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('Logs in with notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, mockEmits);

      await syncStore.login();

      assert.isFalse(syncStore.state.isLoading);
      assert.deepEqual(noteStore.state.notes, localNotes);
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.username, 'd');
      assert.isEmpty(syncStore.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('Fails to log in, with a server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, mockEmits, 500);

      await syncStore.login();

      assert.isFalse(syncStore.state.isLoading);
      assert.isEmpty(noteStore.state.notes);
      assert.isEmpty(syncStore.state.token);
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(syncStore.state.password, '1');
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Auth);
      assert.isNotEmpty(syncStore.state.error.message);
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('With empty notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi([], mockEmits);

      await syncStore.signup();

      assert.isFalse(syncStore.state.isLoading);
      assert.isEmpty(noteStore.state.notes);
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.username, 'd');
      assert.isEmpty(syncStore.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('With notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, mockEmits);
      await noteStore.getAllNotes();

      await syncStore.signup();

      assert.isFalse(syncStore.state.isLoading);
      assert.deepEqual(noteStore.state.notes, localNotes);
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.username, 'd');
      assert.isEmpty(syncStore.state.password);
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
      expect(mockEmits.login).toHaveBeenCalled();
    });

    it('With server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(undefined, mockEmits, 500);

      await syncStore.signup();

      assert.isFalse(syncStore.state.isLoading);
      assert.isEmpty(noteStore.state.notes);
      assert.isEmpty(syncStore.state.token);
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(syncStore.state.password, '1');
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Auth);
      assert.isNotEmpty(syncStore.state.error.message);
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      syncStore.state.token = 'token';
      vi.clearAllMocks();
      mockTauriApi(undefined, mockEmits);
      await syncStore.login();

      await syncStore.logout();

      assert.isFalse(syncStore.state.isLoading);
      assert.isEmpty(syncStore.state.token);
      assert.isEmpty(syncStore.state.username);
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
      expect(mockEmits.logout).toHaveBeenCalled();
    });

    it('With server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      syncStore.state.token = 'token';
      vi.clearAllMocks();
      mockTauriApi();
      await syncStore.login();
      mockTauriApi(undefined, mockEmits, 500);

      await syncStore.logout();

      assert.isFalse(syncStore.state.isLoading);
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Logout);
      assert.isNotEmpty(syncStore.state.error.message);
      expect(mockEmits.logout).not.toHaveBeenCalled();
    });
  });

  describe('pull', () => {
    it('Pulls notes from the server', async () => {
      syncStore.state.username = 'd';
      syncStore.state.token = 'token';
      mockTauriApi(localNotes);
      await syncStore.login();

      await syncStore.pull();

      assert.isFalse(syncStore.state.isLoading);
      assert.deepEqual(noteStore.state.notes, localNotes);
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
    });

    it('With server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.token = 'token';
      mockTauriApi(localNotes, undefined, 500);

      await syncStore.pull();

      assert.isFalse(syncStore.state.isLoading);
      assert.isEmpty(noteStore.state.notes);
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Pull);
      assert.isNotEmpty(syncStore.state.error.message);
    });

    it('User not found', async () => {
      syncStore.state.username = 'd';
      syncStore.state.token = 'token';
      mockTauriApi(localNotes);
      await syncStore.login();
      mockTauriApi([], undefined, 404);

      await syncStore.pull();

      assert.isFalse(syncStore.state.isLoading);
      assert.deepEqual(noteStore.state.notes, localNotes);
      assert.isEmpty(syncStore.state.username);
      assert.isEmpty(syncStore.state.token);
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Pull);
      assert.isNotEmpty(syncStore.state.error.message);
    });
  });

  describe('push', () => {
    it('Pushes notes to the server', async () => {
      syncStore.state.username = 'd';
      syncStore.state.token = 'token';
      syncStore.state.hasUnsyncedNotes = true;
      mockTauriApi(localNotes);
      await syncStore.login();

      await syncStore.push();

      assert.isFalse(syncStore.state.isLoading);
      assert.deepEqual(noteStore.state.notes, localNotes);
      assert.isFalse(syncStore.state.hasUnsyncedNotes);
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
    });

    it('With server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.token = 'token';
      mockTauriApi(localNotes);
      await syncStore.login();
      mockTauriApi([], undefined, 500);

      await syncStore.push();

      assert.isFalse(syncStore.state.isLoading);
      assert.deepEqual(noteStore.state.notes, localNotes);
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Push);
      assert.isNotEmpty(syncStore.state.error.message);
    });
  });
});
