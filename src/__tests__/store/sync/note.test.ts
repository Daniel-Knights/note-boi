import { mount, shallowMount } from '@vue/test-utils';

import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { STORAGE_KEYS } from '../../../constant';
import { isEmptyNote, localStorageParse } from '../../../utils';
import localNotes from '../../notes.json';
import { mockTauriApi } from '../../tauri';
import {
  awaitSyncLoad,
  copyObjArr,
  findByTestId,
  getByTestId,
  resetNoteStore,
  resetSyncStore,
  setCrypto,
  UUID_REGEX,
} from '../../utils';

import NoteMenu from '../../../components/NoteMenu.vue';
import SyncStatus from '../../../components/SyncStatus.vue';

beforeAll(setCrypto);

afterEach(() => {
  resetSyncStore();
  resetNoteStore();
});

describe('Sync', () => {
  describe('pull', () => {
    it('Pulls notes from the server', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi([]);
      await n.getAllNotes();
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      assert.strictEqual(n.state.notes.length, 1);
      mockTauriApi(copyObjArr(localNotes));

      await s.pull();

      assert.isFalse(s.state.isLoading);
      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
      assert.deepEqual(n.state.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(localNotes, { httpStatus: 500 });

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
      mockTauriApi([], { httpStatus: 404 });

      await s.pull();

      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes.sort(n.sortNotesFn));
      assert.isEmpty(s.state.username);
      assert.isEmpty(s.state.token);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.state.error.type, s.ErrorType.Pull);
      assert.isNotEmpty(s.state.error.message);
    });
  });

  describe('push', () => {
    it('Pushes notes to the server', async () => {
      const unsynced = { new: 'new', edited: ['edited'], deleted: ['deleted'] };
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(copyObjArr(localNotes));
      await s.login();
      s.state.unsyncedNoteIds.add(unsynced);
      assert.deepEqual(localStorageParse(STORAGE_KEYS.UNSYNCED), unsynced);

      await s.push();

      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isFalse(s.state.isLoading);
      assert.deepEqual(n.state.notes, localNotes.sort(n.sortNotesFn));
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it("Doesn't push empty notes", async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(copyObjArr(localNotes));
      await s.login();

      n.newNote();

      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));

      await s.push();

      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isFalse(s.state.isLoading);
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);
      assert.strictEqual(s.state.username, 'd');
      assert.strictEqual(s.state.token, 'token');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.USERNAME), 'd');
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.TOKEN), 'token');
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it('With server error', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(copyObjArr(localNotes));
      await s.login();
      mockTauriApi([], { httpStatus: 500 });

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
        const storedId = localStorageParse(STORAGE_KEYS.UNSYNCED).new;

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
      const statusWrapper = mount(SyncStatus);
      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());
      await awaitSyncLoad();
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      const newButton = getByTestId(wrapper, 'new');
      await newButton.trigger('click');

      assertNotOverwritten();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.strictEqual(s.state.unsyncedNoteIds.new, n.state.selectedNote.id);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).new,
        n.state.selectedNote.id
      );
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));

      await s.logout();

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.strictEqual(s.state.unsyncedNoteIds.new, n.state.selectedNote.id);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).new,
        n.state.selectedNote.id
      );
      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));

      s.state.username = 'd';
      s.state.password = '1';
      await s.login();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      n.editNote({}, 'title', 'body');
      await s.push(); // Manually push, as auto push timeout doesn't run

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.strictEqual(s.state.unsyncedNoteIds.size, 0);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));

      await newButton.trigger('click');

      assertNotOverwritten();

      n.selectNote(n.state.notes[1].id);

      const storedIds = localStorageParse(STORAGE_KEYS.UNSYNCED);
      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(storedIds.new);
      assert.isEmpty(storedIds.edited);
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);
      assert.isEmpty(storedIds.deleted);
      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
    });

    it('edited', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const firstCachedNote = { ...n.state.selectedNote };
      n.editNote({}, 'title', 'body');

      assert.isTrue(s.state.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).edited[0],
        firstCachedNote.id
      );

      const statusWrapper = mount(SyncStatus);
      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.state.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(n.state.selectedNote.id, firstCachedNote.id);
      assert.deepEqual(n.state.selectedNote.content, {
        delta: {},
        title: 'title',
        body: 'body',
      });

      n.selectNote(n.state.notes[1].id);
      const secondCachedNote = { ...n.state.selectedNote };
      n.editNote({}, 'title2', 'body2');

      assert.isFalse(s.state.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isTrue(s.state.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.strictEqual(s.state.unsyncedNoteIds.size, 1);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).edited[0],
        secondCachedNote.id
      );

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.state.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isFalse(s.state.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(n.state.selectedNote.id, secondCachedNote.id);
      assert.deepEqual(n.state.selectedNote.content, {
        delta: {},
        title: 'title2',
        body: 'body2',
      });

      n.deleteNote(n.state.selectedNote.id, true);
      await awaitSyncLoad();

      const parsedIds = localStorageParse(STORAGE_KEYS.UNSYNCED);
      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.isTrue(s.state.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.isEmpty(parsedIds.edited);
      assert.strictEqual(parsedIds.deleted[0], secondCachedNote.id);
    });

    it('deleted', async () => {
      s.state.username = 'd';
      s.state.token = 'token';
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      const wrapper = shallowMount(NoteMenu);
      assert.isTrue(wrapper.isVisible());
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const firstCachedNote = { ...n.state.selectedNote };
      n.deleteNote(n.state.selectedNote.id, true);

      assert.isTrue(s.state.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).deleted[0],
        firstCachedNote.id
      );

      const statusWrapper = mount(SyncStatus);
      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());

      const secondCachedNote = { ...n.state.selectedNote };
      n.deleteNote(n.state.selectedNote.id, true);

      assert.isFalse(s.state.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isTrue(s.state.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.strictEqual(s.state.unsyncedNoteIds.deleted.size, 1);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).deleted[0],
        secondCachedNote.id
      );

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.state.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isFalse(s.state.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
    });

    it('Registers unsynced notes if not logged in', async () => {
      mockTauriApi(copyObjArr(localNotes));
      await n.getAllNotes();
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);

      n.newNote(true);

      assert.isTrue(isEmptyNote(n.state.notes[0]));
      assert.isTrue(isEmptyNote(n.state.selectedNote));
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).new,
        n.state.selectedNote.id
      );
      assert.strictEqual(s.state.unsyncedNoteIds.new, n.state.selectedNote.id);
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);

      n.editNote({}, 'title', 'body');

      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
      assert.isEmpty(localStorageParse(STORAGE_KEYS.UNSYNCED).new);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).edited[0],
        n.state.selectedNote.id
      );
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isTrue(s.state.unsyncedNoteIds.edited.has(n.state.selectedNote.id));
      assert.isEmpty(s.state.unsyncedNoteIds.deleted);

      const cachedId = n.state.selectedNote.id;

      n.deleteNote(n.state.selectedNote.id, true);

      assert.isFalse(isEmptyNote(n.state.notes[0]));
      assert.isFalse(isEmptyNote(n.state.selectedNote));
      assert.isEmpty(localStorageParse(STORAGE_KEYS.UNSYNCED).edited);
      assert.strictEqual(localStorageParse(STORAGE_KEYS.UNSYNCED).deleted[0], cachedId);
      assert.isEmpty(s.state.unsyncedNoteIds.new);
      assert.isEmpty(s.state.unsyncedNoteIds.edited);
      assert.isTrue(s.state.unsyncedNoteIds.deleted.has(cachedId));
    });

    describe('Edge cases', () => {
      it('No local, some remote', async () => {
        s.state.username = 'd';
        s.state.password = '1';
        mockTauriApi([]);
        await n.getAllNotes();
        assert.isTrue(isEmptyNote(n.state.notes[0]));
        assert.isTrue(isEmptyNote(n.state.selectedNote));
        assert.strictEqual(n.state.notes.length, 1);
        const wrapper = mount(SyncStatus);
        assert.isTrue(wrapper.isVisible());
        assert.isTrue(findByTestId(wrapper, 'sync-button').exists());
        mockTauriApi(copyObjArr(localNotes));

        await s.login();

        assert.isFalse(s.state.isLoading);
        assert.isTrue(findByTestId(wrapper, 'success').exists());
        assert.isFalse(isEmptyNote(n.state.notes[0]));
        assert.isFalse(isEmptyNote(n.state.selectedNote));
        assert.deepEqual(n.state.notes, localNotes);
        assert.isEmpty(s.state.unsyncedNoteIds.new);
        assert.strictEqual(s.state.unsyncedNoteIds.size, 0);
        assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
        assert.strictEqual(s.state.error.type, s.ErrorType.None);
        assert.isEmpty(s.state.error.message);
      });

      it('No remote, some local', async () => {
        s.state.username = 'd';
        s.state.password = '1';
        mockTauriApi(copyObjArr(localNotes));
        await n.getAllNotes();
        assert.isFalse(isEmptyNote(n.state.notes[0]));
        assert.isFalse(isEmptyNote(n.state.selectedNote));
        assert.strictEqual(n.state.notes.length, localNotes.length);
        const wrapper = mount(SyncStatus);
        assert.isTrue(wrapper.isVisible());
        assert.isTrue(findByTestId(wrapper, 'sync-button').exists());
        mockTauriApi([]);

        await s.login();

        assert.isFalse(s.state.isLoading);
        assert.isTrue(findByTestId(wrapper, 'success').exists());
        assert.isFalse(isEmptyNote(n.state.notes[0]));
        assert.isFalse(isEmptyNote(n.state.selectedNote));
        assert.deepEqual(n.state.notes, localNotes);
        assert.isEmpty(s.state.unsyncedNoteIds.new);
        assert.strictEqual(s.state.unsyncedNoteIds.size, 0);
        assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
        assert.strictEqual(s.state.error.type, s.ErrorType.None);
        assert.isEmpty(s.state.error.message);
      });
    });
  });
});
