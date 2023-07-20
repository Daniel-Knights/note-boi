import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { STORAGE_KEYS } from '../../../constant';
import { isEmptyNote } from '../../../utils';
import localNotes from '../../notes.json';
import { mockTauriApi } from '../../tauri';
import { copyObjArr } from '../../utils';

const mockEmits = {
  login: vi.fn(),
  logout: vi.fn(),
};

describe('Sync', () => {
  describe('login', () => {
    it('With no notes', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi([], { mockFns: mockEmits });

      await n.getAllNotes();

      assert.strictEqual(n.noteState.notes.length, 1);

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
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it('With notes', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi(localNotes, { mockFns: mockEmits });

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
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it('Fails to log in, with a server error', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi(localNotes, { mockFns: mockEmits, httpStatus: 500 });

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
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('With no notes', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi([], { mockFns: mockEmits });

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it('With notes', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi(localNotes, { mockFns: mockEmits });
      await n.getAllNotes();
      const unsyncedClearSpy = vi.spyOn(s.syncState.unsyncedNoteIds, 'clear');

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'd');
      assert.isEmpty(s.syncState.password);
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it("Doesn't push empty notes", async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi(copyObjArr(localNotes));

      n.newNote();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
    });

    it('With server error', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      mockTauriApi(undefined, { mockFns: mockEmits, httpStatus: 500 });

      await s.signup();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.isEmpty(s.syncState.token);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.password, '1');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('Logs a user out and clears user-based state', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      s.syncState.token = 'token';
      mockTauriApi(undefined, { mockFns: mockEmits });
      await s.login();

      await s.logout();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(s.syncState.token);
      assert.isEmpty(s.syncState.username);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      expect(mockEmits.logout).toHaveBeenCalledOnce();
    });

    it('With server error', async () => {
      s.syncState.username = 'd';
      s.syncState.password = '1';
      s.syncState.token = 'token';
      mockTauriApi();
      await s.login();
      mockTauriApi(undefined, { mockFns: mockEmits, httpStatus: 500 });

      await s.logout();

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Logout);
      assert.isNotEmpty(s.syncState.error.message);
      expect(mockEmits.logout).not.toHaveBeenCalled();
    });
  });
});
