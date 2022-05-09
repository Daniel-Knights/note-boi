import { mount, shallowMount } from '@vue/test-utils';

import {
  awaitSyncLoad,
  copyObjArr,
  findByTestId,
  getByTestId,
  resetNoteStore,
  resetSyncStore,
  setCrypto,
  UUID_REGEX,
} from '../utils';
import { mockTauriApi } from '../tauri';
import { isEmptyNote, localStorageParse } from '../../utils';
import * as s from '../../store/sync';
import * as n from '../../store/note';
import localNotes from '../notes.json';

import NoteMenu from '../../components/NoteMenu.vue';
import SyncStatus from '../../components/SyncStatus.vue';

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
      mockTauriApi(copyObjArr(localNotes));
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
      mockTauriApi(copyObjArr(localNotes));
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
      const unsynced = { new: 'new', edited: ['edited'], deleted: ['deleted'] };
      s.state.username = 'd';
      s.state.token = 'token';
      s.state.unsyncedNoteIds.add(unsynced);
      mockTauriApi(copyObjArr(localNotes));
      await s.login();
      assert.deepEqual(localStorageParse('unsynced-note-ids'), unsynced);

      await s.push();

      assert.isNull(localStorage.getItem('unsynced-note-ids'));
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
      mockTauriApi(copyObjArr(localNotes));
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

  describe('unsyncedNoteIds', () => {
    it('new', async () => {
      function assertNotOverwritten() {
        const storedId = localStorageParse('unsynced-note-ids').new;

        assert.isNotEmpty(s.state.unsyncedNoteIds.new);
        assert.match(storedId, UUID_REGEX);
        assert.strictEqual(storedId, s.state.unsyncedNoteIds.new);
        assert.strictEqual(storedId, n.state.notes[0].id);
        assert.strictEqual(storedId, n.state.selectedNote.id);
        assert.isTrue(isEmptyNote(n.state.notes[0]));
        assert.isTrue(isEmptyNote(n.state.selectedNote));
      }

      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isNull(localStorage.getItem('unsynced-note-ids'));
      const newButton = getByTestId(wrapper, 'new');
      await newButton.trigger('click');

      assertNotOverwritten();

      const statusWrapper = mount(SyncStatus);
      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assertNotOverwritten();

      await s.logout();

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assertNotOverwritten();

      s.state.username = 'd';
      s.state.token = 'token';
      await s.login();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      n.editNote('delta', 'title', 'body');

      await awaitSyncLoad();

      const storedIds = localStorageParse('unsynced-note-ids');

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(storedIds.new);
      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
      assert.strictEqual(storedIds.edited[0], n.state.selectedNote.id);
      assert.isTrue(s.state.unsyncedNoteIds.edited.has(n.state.selectedNote.id));

      await s.push();
      await newButton.trigger('click');
      const cachedNote = { ...n.state.selectedNote };

      assertNotOverwritten();

      n.selectNote(n.state.notes[1].id);

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(storedIds.new);
      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
      assert.strictEqual(storedIds.edited[0], n.state.selectedNote.id);
      assert.isFalse(s.state.unsyncedNoteIds.deleted.has(n.state.selectedNote.id));
      assert.isFalse(s.state.unsyncedNoteIds.deleted.has(cachedNote.id));
    });

    it('edited', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      s.state.autoSyncEnabled = false;
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isNull(localStorage.getItem('unsynced-note-ids'));

      const cachedNote = { ...n.state.selectedNote };
      n.editNote('delta', 'title', 'body');

      assert.isTrue(s.state.unsyncedNoteIds.edited.has(cachedNote.id));
      assert.strictEqual(localStorageParse('unsynced-note-ids').edited[0], cachedNote.id);

      const statusWrapper = mount(SyncStatus);
      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.isTrue(s.state.unsyncedNoteIds.edited.has(cachedNote.id));
      assert.strictEqual(localStorageParse('unsynced-note-ids').edited[0], cachedNote.id);
      assert.strictEqual(n.state.selectedNote.id, cachedNote.id);
      assert.deepEqual(n.state.selectedNote.content, {
        delta: 'delta',
        title: 'title',
        body: 'body',
      });

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.state.unsyncedNoteIds.edited.has(cachedNote.id));
      assert.isNull(localStorage.getItem('unsynced-note-ids'));
      assert.strictEqual(n.state.selectedNote.id, cachedNote.id);
      assert.deepEqual(n.state.selectedNote.content, {
        delta: 'delta',
        title: 'title',
        body: 'body',
      });

      n.deleteNote(n.state.selectedNote.id, true);
      await awaitSyncLoad();

      const parsedIds = localStorageParse('unsynced-note-ids');
      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.isFalse(s.state.unsyncedNoteIds.edited.has(cachedNote.id));
      assert.isTrue(s.state.unsyncedNoteIds.deleted.has(cachedNote.id));
      assert.isEmpty(parsedIds.edited);
      assert.strictEqual(parsedIds.deleted[0], cachedNote.id);
    });

    // it('deleted', async () => {});
  });
});
