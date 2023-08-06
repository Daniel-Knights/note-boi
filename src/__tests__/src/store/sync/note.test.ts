import { clearMocks } from '@tauri-apps/api/mocks';
import { mount, shallowMount } from '@vue/test-utils';

import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { STORAGE_KEYS } from '../../../../constant';
import { isEmptyNote, localStorageParse } from '../../../../utils';
import { clearMockApiResults, mockApi } from '../../../api';
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
      const { calls, events } = mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[]],
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      await n.getAllNotes();

      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes[0].id, n.noteState.selectedNote.id);

      clearMockApiResults({ calls, events });

      await s.pull();

      assert.isFalse(s.syncState.isLoading);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 3);
      assert.isTrue(calls.has('/notes/push'));
      assert.isTrue(calls.has('/notes/pull'));
      assert.isTrue(calls.has('sync_local_notes'));
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it('With server error', async () => {
      const { calls, events } = mockApi({
        request: {
          error: '/notes/pull',
        },
      });

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      await s.pull();

      assert.isFalse(s.syncState.isLoading);
      assert.isEmpty(n.noteState.notes);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Pull);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/notes/pull'));
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it('User not found', async () => {
      const { calls, events } = mockApi();

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
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/notes/pull'));
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it('Updates editor if selected note is unedited', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      const wrapper = mount(Editor);
      const editorBody = getByTestId(wrapper, 'body');

      assert.isEmpty(editorBody.text());

      await n.getAllNotes();

      assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

      const remoteNotes = copyObjArr(localNotes);
      remoteNotes.forEach((nt) => {
        if (nt.id === n.noteState.selectedNote.id) {
          nt.content = {
            delta: { ops: [{ insert: 'Remote update' }] },
            title: 'Remote update',
            body: '',
          };
        }
      });

      clearMocks();

      mockApi({
        request: {
          resValue: {
            '/notes/pull': [remoteNotes],
          },
        },
      });

      await s.pull();

      assert.include(editorBody.text(), 'Remote update');
    });

    it('Updates note menu', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      const wrapper = shallowMount(NoteMenu);

      function assertNoteItemText(id: string, text: string) {
        assert.strictEqual(wrapper.get(`[data-note-id="${id}"]`).text(), text);
      }

      assert.isEmpty(wrapper.findAll('li'));

      await n.getAllNotes();

      assert.strictEqual(wrapper.findAll('li').length, 10);
      assertNoteItemText(n.noteState.selectedNote.id, 'Note with special characters😬ö');

      const remoteNotes = copyObjArr<n.Note>(localNotes);
      remoteNotes.forEach((nt) => {
        if (nt.id === n.noteState.selectedNote.id) {
          nt.content = {
            delta: { ops: [{ insert: 'Remote update' }, { insert: '-body' }] },
            title: 'Remote update',
            body: '-body',
          };
        }
      });

      const newRemoteNote = new n.Note();
      newRemoteNote.content = {
        delta: { ops: [{ insert: 'New note' }, { insert: '-body' }] },
        title: 'New note',
        body: '-body',
      };

      remoteNotes.push(newRemoteNote);
      remoteNotes.splice(5, 2); // Deleted remote notes

      clearMocks();

      mockApi({
        request: {
          resValue: {
            '/notes/pull': [remoteNotes],
          },
        },
      });

      await s.pull();

      assert.strictEqual(wrapper.findAll('li').length, 9);
      assertNoteItemText(n.noteState.selectedNote.id, 'Remote update-body');
      assertNoteItemText(newRemoteNote.id, 'New note-body');
    });
  });

  describe('push', () => {
    it('Pushes notes to the server', async () => {
      const { calls, events } = mockApi();

      await n.getAllNotes();

      const unsynced = { new: 'new', edited: ['edited'], deleted: ['deleted'] };

      s.syncState.username = 'd';
      s.syncState.token = 'token';
      s.syncState.unsyncedNoteIds.add(unsynced);

      assert.deepEqual(localStorageParse(STORAGE_KEYS.UNSYNCED), unsynced);

      clearMockApiResults({ calls, events });

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
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/notes/push'));
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it("Doesn't push empty notes", async () => {
      const { calls, events } = mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      n.newNote();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      clearMockApiResults({ calls, events });

      await s.push();

      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 0);
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it('With server error', async () => {
      const { calls, events } = mockApi({
        request: {
          error: '/notes/push',
        },
      });

      await n.getAllNotes();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      clearMockApiResults({ calls, events });

      await s.push();

      assert.deepEqual(n.noteState.notes, localNotes);
      assert.strictEqual(s.syncState.username, 'd');
      assert.strictEqual(s.syncState.token, 'token');
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Push);
      assert.isNotEmpty(s.syncState.error.message);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/notes/push'));
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });
  });

  describe('unsyncedNoteIds', () => {
    it('new', async () => {
      function assertNotOverwritten() {
        const storedId = localStorageParse(STORAGE_KEYS.UNSYNCED).new;

        assert.isNotEmpty(s.syncState.unsyncedNoteIds.new);
        assert.match(storedId, UUID_REGEX);
        assert.strictEqual(storedId, s.syncState.unsyncedNoteIds.new);
        assert.strictEqual(storedId, n.noteState.notes[0].id);
        assert.strictEqual(storedId, n.noteState.selectedNote.id);
        assert.isTrue(isEmptyNote(n.noteState.notes[0]));
        assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      }

      mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';
      await n.getAllNotes();

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

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).new,
        n.noteState.selectedNote.id
      );
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await s.logout();

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).new,
        n.noteState.selectedNote.id
      );
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
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));

      await newButton.trigger('click');

      assertNotOverwritten();

      n.selectNote(n.noteState.notes[1].id);

      const storedIds = localStorageParse(STORAGE_KEYS.UNSYNCED);

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isEmpty(storedIds.new);
      assert.isEmpty(storedIds.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);
      assert.isEmpty(storedIds.deleted);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    });

    it('edited', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      await n.getAllNotes();

      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const firstCachedNote = { ...n.noteState.selectedNote };

      n.editNote({}, 'title', 'body');

      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).edited[0],
        firstCachedNote.id
      );

      const statusWrapper = mount(SyncStatus);

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(n.noteState.selectedNote.id, firstCachedNote.id);
      assert.deepEqual(n.noteState.selectedNote.content, {
        delta: {},
        title: 'title',
        body: 'body',
      });

      n.selectNote(n.noteState.notes[1].id);

      const secondCachedNote = { ...n.noteState.selectedNote };

      n.editNote({}, 'title2', 'body2');

      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 1);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).edited[0],
        secondCachedNote.id
      );

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));
      assert.strictEqual(n.noteState.selectedNote.id, secondCachedNote.id);
      assert.deepEqual(n.noteState.selectedNote.content, {
        delta: {},
        title: 'title2',
        body: 'body2',
      });

      n.deleteNote(n.noteState.selectedNote.id);

      await awaitSyncLoad();

      const parsedIds = localStorageParse(STORAGE_KEYS.UNSYNCED);

      assert.isTrue(findByTestId(statusWrapper, 'sync-button').exists());
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.isEmpty(parsedIds.edited);
      assert.strictEqual(parsedIds.deleted[0], secondCachedNote.id);
    });

    it('deleted', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.token = 'token';

      await n.getAllNotes();

      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);
      assert.isNull(localStorage.getItem(STORAGE_KEYS.UNSYNCED));

      const firstCachedNote = { ...n.noteState.selectedNote };

      n.deleteNote(n.noteState.selectedNote.id);

      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).deleted[0],
        firstCachedNote.id
      );

      const statusWrapper = mount(SyncStatus);

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await awaitSyncLoad();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());

      const secondCachedNote = { ...n.noteState.selectedNote };

      n.deleteNote(n.noteState.selectedNote.id);

      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.strictEqual(s.syncState.unsyncedNoteIds.deleted.size, 1);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).deleted[0],
        secondCachedNote.id
      );

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

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).new,
        n.noteState.selectedNote.id
      );
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      n.editNote({}, 'title', 'body');

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.isEmpty(localStorageParse(STORAGE_KEYS.UNSYNCED).new);
      assert.strictEqual(
        localStorageParse(STORAGE_KEYS.UNSYNCED).edited[0],
        n.noteState.selectedNote.id
      );
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(n.noteState.selectedNote.id));
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      const cachedId = n.noteState.selectedNote.id;

      n.deleteNote(n.noteState.selectedNote.id);

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.isEmpty(localStorageParse(STORAGE_KEYS.UNSYNCED).edited);
      assert.strictEqual(localStorageParse(STORAGE_KEYS.UNSYNCED).deleted[0], cachedId);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(cachedId));
    });

    describe('Edge cases', () => {
      it('No local, some remote', async () => {
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
        assert.strictEqual(n.noteState.notes.length, 1);

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

      it('No remote, some local', async () => {
        mockApi();

        s.syncState.username = 'd';
        s.syncState.password = '1';

        await n.getAllNotes();

        assert.isFalse(isEmptyNote(n.noteState.notes[0]));
        assert.isFalse(isEmptyNote(n.noteState.selectedNote));
        assert.strictEqual(n.noteState.notes.length, localNotes.length);

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
    });
  });
});
