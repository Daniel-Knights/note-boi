import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { STORAGE_KEYS } from '../../../constant';
import { isEmptyNote } from '../../../utils';
import localNotes from '../../notes.json';
import { mockTauriApi } from '../../tauri';
import { copyObjArr, resetNoteStore, resetSyncStore, setCrypto } from '../../utils';

const mockEmits = {
  login: vi.fn(),
  logout: vi.fn(),
};

beforeAll(setCrypto);

afterEach(() => {
  resetSyncStore();
  resetNoteStore();
});

describe('Sync', () => {
  describe('login', () => {
    it('With no notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi([], { mockFns: mockEmits });

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
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it('With notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, { mockFns: mockEmits });

      await s.login();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it('Fails to log in, with a server error', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, { mockFns: mockEmits, httpStatus: 500 });

      await s.login();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.isEmpty(s.state.token);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.password, '1');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.state.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.state.error.message);
      expect(mockEmits.login).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('With no notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi([], { mockFns: mockEmits });

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it('With notes', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(localNotes, { mockFns: mockEmits });
      await n.getAllNotes();
      const unsyncedClearSpy = vi.spyOn(s.state.unsyncedNoteIds, 'clear');

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes);
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.isEmpty(s.state.password);
      expect(unsyncedClearSpy).toHaveBeenCalledOnce();
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.login).toHaveBeenCalledOnce();
    });

    it("Doesn't push empty notes", async () => {
      s.state.username = 'd';
      s.state.password = '1';
      mockTauriApi(copyObjArr(localNotes));

      n.newNote();

      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      vi.clearAllMocks();
      mockTauriApi(undefined, { mockFns: mockEmits, httpStatus: 500 });

      await s.signup();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(n.state.notes);
      assert.isEmpty(s.state.token);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.password, '1');
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
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
      mockTauriApi(undefined, { mockFns: mockEmits });
      await s.login();

      await s.logout();

      assert.isFalse(s.state.isLoading);
      assert.isEmpty(s.state.token);
      assert.isEmpty(s.state.username);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
      expect(mockEmits.logout).toHaveBeenCalledOnce();
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.password = '1';
      s.state.token = 'token';
      vi.clearAllMocks();
      mockTauriApi();
      await s.login();
      mockTauriApi(undefined, { mockFns: mockEmits, httpStatus: 500 });

      await s.logout();

      assert.isFalse(s.state.isLoading);
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.Logout);
      assert.isNotEmpty(s.state.error.message);
      expect(mockEmits.logout).not.toHaveBeenCalled();
    });
  });
});
