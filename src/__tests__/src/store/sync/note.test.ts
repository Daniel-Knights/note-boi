import { clearMocks } from '@tauri-apps/api/mocks';
import { mount, shallowMount } from '@vue/test-utils';

import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { isEmptyNote, localStorageParse } from '../../../../utils';
import { clearMockApiResults, mockApi, mockDb } from '../../../api';
import localNotes from '../../../notes.json';
import {
  awaitSyncLoad,
  copyObjArr,
  findByTestId,
  getByTestId,
  UUID_REGEX,
} from '../../../utils';

import Editor from '../../../../components/Editor.vue';
import NoteMenu from '../../../../components/NoteMenu.vue';
import SyncStatus from '../../../../components/SyncStatus.vue';

describe('Sync', () => {
  describe('pull', () => {
    it('Pulls notes from the server', async () => {
      const { calls } = mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[]],
          },
        },
        request: {
          resValue: {
            '/notes/pull': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes[0]!.id, n.noteState.selectedNote.id);

      clearMockApiResults({ calls });

      await s.pull();

      assert.isFalse(s.syncState.isLoading);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/pull'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: '/notes/pull',
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      clearMockApiResults({ calls });

      await s.pull();

      assert.isFalse(s.syncState.isLoading);
      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes[0]!.id, n.noteState.selectedNote.id);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Pull);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/notes/pull'));
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.token = 'token';
      localStorage.setItem(STORAGE_KEYS.USERNAME, 'k');
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'token');

      await s.pull();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(s.syncState.username);
      assert.isEmpty(s.syncState.token);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.USERNAME));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.TOKEN));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Pull);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/notes/pull'));
    });

    it('Updates editor if selected note is unedited', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const wrapper = mount(Editor);
      const editorBody = getByTestId(wrapper, 'body');

      assert.isEmpty(editorBody.text());

      await n.getAllNotes();

      assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

      const unencryptedRemoteNotes = copyObjArr(localNotes);
      const unencryptedRemoteSelectedNote = unencryptedRemoteNotes.find(
        (nt) => nt.id === n.noteState.selectedNote.id
      );

      unencryptedRemoteSelectedNote!.content = {
        delta: { ops: [{ insert: 'Remote update' }] },
        title: 'Remote update',
        body: '',
      };

      const encryptedRemoteNotes = await s.Encryptor.encryptNotes(unencryptedRemoteNotes);

      clearMocks();

      mockApi({
        request: {
          resValue: {
            '/notes/pull': [{ notes: encryptedRemoteNotes }],
          },
        },
      });

      await s.pull();

      assert.include(editorBody.text(), 'Remote update');
    });

    it('Updates note menu', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const wrapper = shallowMount(NoteMenu);

      function assertNoteItemText(id: string, text: string) {
        assert.strictEqual(wrapper.get(`[data-note-id="${id}"]`).text(), text);
      }

      assert.lengthOf(wrapper.findAll('li'), 1);

      await n.getAllNotes();

      assert.lengthOf(wrapper.findAll('li'), 10);
      assertNoteItemText(n.noteState.selectedNote.id, 'Note with special characters😬ö');

      const unencryptedRemoteNotes = copyObjArr<n.Note>(localNotes);
      const unencryptedRemoteSelectedNote = unencryptedRemoteNotes.find(
        (nt) => nt.id === n.noteState.selectedNote.id
      );

      unencryptedRemoteSelectedNote!.content = {
        delta: { ops: [{ insert: 'Remote update' }, { insert: '-body' }] },
        title: 'Remote update',
        body: '-body',
      };

      const newRemoteNote = new n.Note();
      newRemoteNote.content = {
        delta: { ops: [{ insert: 'New note' }, { insert: '-body' }] },
        title: 'New note',
        body: '-body',
      };

      unencryptedRemoteNotes.push(newRemoteNote);
      unencryptedRemoteNotes.splice(5, 2); // Deleted remote notes

      const encryptedRemoteNotes = await s.Encryptor.encryptNotes(unencryptedRemoteNotes);

      clearMocks();

      mockApi({
        request: {
          resValue: {
            '/notes/pull': [{ notes: encryptedRemoteNotes }],
          },
        },
      });

      await s.pull();

      assert.lengthOf(wrapper.findAll('li'), 9);
      assertNoteItemText(n.noteState.selectedNote.id, 'Remote update-body');
      assertNoteItemText(newRemoteNote.id, 'New note-body');
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const tauriFetchSpy = vi.spyOn(s, 'tauriFetch');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      tauriFetchSpy.mockRejectedValue(new Error('Mock reject'));

      try {
        await s.pull();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(tauriFetchSpy).toHaveBeenCalledOnce();
    });
  });

  describe('push', () => {
    it('Pushes notes to the server', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      const unsynced = { new: 'new', edited: ['edited'], deleted: ['deleted'] };

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      s.syncState.unsyncedNoteIds.add(unsynced);

      assert.deepEqual(
        localStorageParse<s.StoredUnsyncedNoteIds>(STORAGE_KEYS.UNSYNCED),
        unsynced
      );

      clearMockApiResults({ calls });

      await s.push();

      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/notes/push'));
    });

    it("Doesn't push empty notes", async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      n.newNote();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      clearMockApiResults({ calls });

      await s.push();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 0);
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: '/notes/push',
        },
      });

      await n.getAllNotes();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      n.editNote({}, 'title', 'body');

      clearMockApiResults({ calls });

      await s.push();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Push);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.request.has('/notes/push'));
    });

    it('Sets and resets loading state', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      n.editNote({}, 'title', 'body');

      const tauriFetchSpy = vi.spyOn(s, 'tauriFetch');
      const isLoadingSpy = vi.spyOn(s.syncState, 'isLoading', 'set');

      tauriFetchSpy.mockRejectedValue(new Error('Mock reject'));

      try {
        await s.push();
      } catch {
        expect(isLoadingSpy).toHaveBeenCalledWith(true);
        assert.isFalse(s.syncState.isLoading);
      }

      expect(tauriFetchSpy).toHaveBeenCalledOnce();
    });
  });

  describe('unsyncedNoteIds', () => {
    it('new', async () => {
      function assertNotOverwritten() {
        const storedId = localStorageParse<s.StoredUnsyncedNoteIds>(STORAGE_KEYS.UNSYNCED)
          ?.new;

        assert.isNotEmpty(s.syncState.unsyncedNoteIds.new);
        assert.match(storedId || '', UUID_REGEX);
        assert.strictEqual(storedId, s.syncState.unsyncedNoteIds.new);
        assert.strictEqual(storedId, n.noteState.notes[0]!.id);
        assert.strictEqual(storedId, n.noteState.selectedNote.id);
        assert.isTrue(isEmptyNote(n.noteState.notes[0]));
        assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      }

      mockApi({
        request: {
          resValue: {
            '/notes/pull': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const wrapper = shallowMount(NoteMenu);

      assert.isTrue(wrapper.isVisible());

      const statusWrapper = mount(SyncStatus);

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const newButton = getByTestId(wrapper, 'new');
      await newButton.trigger('click');

      assertNotOverwritten();

      let storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.strictEqual(storedUnsyncedNoteIds?.new, n.noteState.selectedNote.id);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await s.logout();

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.strictEqual(storedUnsyncedNoteIds?.new, n.noteState.selectedNote.id);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());

      n.editNote({}, 'title', 'body');

      await s.push(); // Manually push, as auto push timeout doesn't run
      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      // See editNote for why we expect selectedNote to be empty
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await newButton.trigger('click');

      assertNotOverwritten();

      n.selectNote(n.noteState.notes[1]!.id);

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isEmpty(storedUnsyncedNoteIds?.new);
      assert.isEmpty(storedUnsyncedNoteIds?.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);
      assert.isEmpty(storedUnsyncedNoteIds?.deleted);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    });

    it('edited', async () => {
      mockApi({
        request: {
          resValue: {
            '/notes/pull': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const firstCachedNote = { ...n.noteState.selectedNote };

      n.editNote({}, 'title', 'body');

      let storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.strictEqual(storedUnsyncedNoteIds?.edited[0], firstCachedNote.id);

      const statusWrapper = mount(SyncStatus);

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(n.noteState.selectedNote.id, firstCachedNote.id);
      // See editNote for why we don't use selectedNote here
      assert.deepEqual(n.findNote(n.noteState.selectedNote.id)!.content, {
        delta: {},
        title: 'title',
        body: 'body',
      });

      n.selectNote(n.noteState.notes[1]!.id);

      const secondCachedNote = { ...n.noteState.selectedNote };

      n.editNote({}, 'title2', 'body2');

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 1);
      assert.strictEqual(storedUnsyncedNoteIds?.edited[0], secondCachedNote.id);

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(n.noteState.selectedNote.id, secondCachedNote.id);
      // See editNote for why we don't use selectedNote here
      assert.deepEqual(n.findNote(n.noteState.selectedNote.id)!.content, {
        delta: {},
        title: 'title2',
        body: 'body2',
      });

      n.deleteNote(n.noteState.selectedNote.id);

      await awaitSyncLoad();

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.isEmpty(storedUnsyncedNoteIds?.edited);
      assert.strictEqual(storedUnsyncedNoteIds?.deleted[0], secondCachedNote.id);
    });

    it('deleted', async () => {
      mockApi({
        request: {
          resValue: {
            '/notes/pull': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const firstCachedNote = { ...n.noteState.selectedNote };

      n.deleteNote(n.noteState.selectedNote.id);

      let storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.strictEqual(storedUnsyncedNoteIds?.deleted[0], firstCachedNote.id);

      const statusWrapper = mount(SyncStatus);

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());

      const secondCachedNote = { ...n.noteState.selectedNote };

      n.deleteNote(n.noteState.selectedNote.id);

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.strictEqual(s.syncState.unsyncedNoteIds.deleted.size, 1);
      assert.strictEqual(storedUnsyncedNoteIds?.deleted[0], secondCachedNote.id);

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
    });

    it('Registers unsynced notes if not logged in', async () => {
      mockApi();

      await n.getAllNotes();

      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      n.newNote(true);

      let storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(storedUnsyncedNoteIds?.new, n.noteState.selectedNote.id);
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      n.editNote({}, 'title', 'body');

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      // See editNote for why selectedNote should be empty
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.isEmpty(storedUnsyncedNoteIds?.new);
      assert.strictEqual(storedUnsyncedNoteIds?.edited[0], n.noteState.selectedNote.id);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(n.noteState.selectedNote.id));
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      const cachedId = n.noteState.selectedNote.id;

      n.deleteNote(n.noteState.selectedNote.id);

      storedUnsyncedNoteIds = localStorageParse<s.StoredUnsyncedNoteIds>(
        STORAGE_KEYS.UNSYNCED
      );

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.isEmpty(storedUnsyncedNoteIds?.edited);
      assert.strictEqual(storedUnsyncedNoteIds?.deleted[0], cachedId);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(cachedId));
    });
  });

  describe('Edge cases', () => {
    it('No local, some remote', async () => {
      mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[]],
          },
        },
        request: {
          resValue: {
            '/login': [{ notes: mockDb.encryptedNotes, token: 'token' }],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, 1);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(findByTestId(wrapper, 'sync-button').exists());

      await s.login();

      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(findByTestId(wrapper, 'success').exists());
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
    });

    it('No remote, some local', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, localNotes.length);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(findByTestId(wrapper, 'sync-button').exists());

      await s.login();

      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(findByTestId(wrapper, 'success').exists());
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
    });

    it('No local, no remote', async () => {
      mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[]],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await n.getAllNotes();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, 1);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(findByTestId(wrapper, 'sync-button').exists());

      await s.login();

      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(findByTestId(wrapper, 'success').exists());
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
    });
  });
});
