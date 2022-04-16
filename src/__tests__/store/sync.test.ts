import { assert, beforeAll, beforeEach, describe, it } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';

import * as syncStore from '../../store/sync';
import * as noteStore from '../../store/note';
import { isEmptyNote } from '../../utils';
import { mockPromise, resetNoteStore, setCrypto } from '../utils';
import localNotes from '../notes.json';

function mockInvokes(notes?: noteStore.Note[], httpError?: boolean) {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'tauri':
        switch ((args.message as { cmd: string }).cmd) {
          case 'httpRequest':
            return new Promise<Record<string, unknown>>((res) => {
              const reqType = (
                args.message as { options: { url: string } }
              )?.options?.url.split('/api/')[1];

              const resData: { notes?: noteStore.Note[]; token?: string } = {};

              switch (reqType) {
                case 'login':
                  resData.notes = localNotes;
                  resData.token = 'token';
                  break;
                case 'signup':
                  resData.token = 'token';
                  break;
                // no default
              }

              res({
                status: httpError ? 500 : 200,
                data: httpError ? 'Error' : JSON.stringify(resData),
              });
            });
          // no default
        }
        break;
      case 'get_all_notes':
        return mockPromise(notes);
      case 'sync_all_local_notes':
        return mockPromise();
      // no default
    }
  });
}

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
      mockInvokes([]);

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
    });

    it('Logs in with notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      mockInvokes(localNotes);

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
    });

    it('Fails to log in, with a server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      mockInvokes(localNotes, true);

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
    });
  });

  describe('signup', () => {
    it('With empty notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      mockInvokes([]);

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
    });

    it('With notes', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      mockInvokes(localNotes);
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
    });

    it('With server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      mockInvokes(undefined, true);

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
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      syncStore.state.token = 'token';
      mockInvokes();
      await syncStore.login();

      await syncStore.logout();

      assert.isFalse(syncStore.state.isLoading);
      assert.isEmpty(syncStore.state.token);
      assert.isEmpty(syncStore.state.username);
      assert.isNull(localStorage.getItem('username'));
      assert.isNull(localStorage.getItem('token'));
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.None);
      assert.isEmpty(syncStore.state.error.message);
    });

    it('With server error', async () => {
      syncStore.state.username = 'd';
      syncStore.state.password = '1';
      syncStore.state.token = 'token';
      mockInvokes();
      await syncStore.login();
      mockInvokes(undefined, true);

      await syncStore.logout();

      assert.isFalse(syncStore.state.isLoading);
      assert.strictEqual(syncStore.state.token, 'token');
      assert.strictEqual(syncStore.state.username, 'd');
      assert.strictEqual(localStorage.getItem('username'), 'd');
      assert.strictEqual(localStorage.getItem('token'), 'token');
      assert.strictEqual(syncStore.state.error.type, syncStore.ErrorType.Logout);
      assert.isNotEmpty(syncStore.state.error.message);
    });
  });
});
