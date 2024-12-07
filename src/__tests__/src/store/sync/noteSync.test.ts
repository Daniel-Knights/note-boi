import { clearMocks } from '@tauri-apps/api/mocks';
import { mount, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../../store/note';
import * as s from '../../../../store/sync';
import { Encryptor, ERROR_CODE, KeyStore, Storage } from '../../../../classes';
import { isEmptyNote, tauriInvoke } from '../../../../utils';
import { clearMockApiResults, mockApi, mockDb } from '../../../api';
import localNotes from '../../../notes.json';
import {
  assertAppError,
  assertLoadingState,
  copyObjArr,
  findByTestId,
  getByTestId,
  resolveImmediate,
  UUID_REGEX,
  waitUntil,
} from '../../../utils';

import Editor from '../../../../components/Editor.vue';
import NoteMenu from '../../../../components/NoteMenu.vue';
import SyncStatus from '../../../../components/SyncStatus.vue';

describe('Note (sync)', () => {
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

      assertAppError();
      assert.isFalse(s.syncState.isLoading);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.strictEqual(calls.size, 5);
      assert.isTrue(calls.request.has('/notes/pull'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With encryptor error', async () => {
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

      await tauriInvoke('set_access_token', {
        username: 'd',
        accessToken: 'test-token',
      });

      await n.getAllNotes();

      clearMockApiResults({ calls });

      await s.pull();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: s.pull },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/notes/pull'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/notes/pull',
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      clearMockApiResults({ calls });

      await s.pull();

      assertAppError({
        code: ERROR_CODE.PULL,
        retry: { fn: s.pull },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes[0]!.id, n.noteState.selectedNote.id);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/pull'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User unauthorised', async () => {
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/notes/pull',
            status: 401,
          },
        },
      });

      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      s.syncState.username = 'd';
      s.syncState.password = '1';
      Storage.set('USERNAME', 'd');

      await s.pull();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError({
        code: ERROR_CODE.PULL,
        retry: { fn: s.pull },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/notes/pull'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'd' });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('User not found', async () => {
      const { calls } = mockApi();
      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      s.syncState.username = 'k';
      s.syncState.isLoggedIn = true;
      Storage.set('USERNAME', 'k');

      await s.pull();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError({
        code: ERROR_CODE.PULL,
        retry: { fn: s.pull },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/notes/pull'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'k' });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
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

      const encryptedRemoteNotes = await Encryptor.encryptNotes(unencryptedRemoteNotes);

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

      const encryptedRemoteNotes = await Encryptor.encryptNotes(unencryptedRemoteNotes);

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

    it('Sets and resets loading state', () => {
      return assertLoadingState(() => {
        return s.pull();
      });
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

      assert.deepEqual(Storage.getJson('UNSYNCED'), unsynced);

      clearMockApiResults({ calls });

      await s.push();

      assertAppError();
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.isFalse(s.syncState.isLoading);
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/push'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it("Doesn't push empty notes", async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      n.newNote();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      clearMockApiResults({ calls });

      await s.push();

      assertAppError();
      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(calls.size, 0);
    });

    it('With encryptor error', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      n.editNote({}, 'Title', 'Body');

      await KeyStore.reset();

      clearMockApiResults({ calls });

      await s.push(true);

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        retry: { fn: s.push, args: [true] },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('With server error', async () => {
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/notes/push',
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      n.editNote({}, 'title', 'body');

      clearMockApiResults({ calls });

      await s.push();

      assertAppError({
        code: ERROR_CODE.PUSH,
        retry: { fn: s.push, args: [] },
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/push'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User unauthorised', async () => {
      const { calls } = mockApi({
        request: {
          error: {
            endpoint: '/notes/push',
            status: 401,
          },
        },
      });

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      n.editNote({}, 'title', 'body');

      clearMockApiResults({ calls });

      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      await s.push();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError({
        code: ERROR_CODE.PUSH,
        retry: { fn: s.push, args: [] },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/notes/push'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'd' });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';

      await n.getAllNotes();
      await s.signup();

      n.editNote({}, 'title', 'body');

      clearMockApiResults({ calls });

      delete mockDb.users.k; // Deleted from different device, for example

      const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

      await s.push();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError({
        code: ERROR_CODE.PUSH,
        retry: { fn: s.push, args: [] },
        display: { sync: true },
      });

      assert.isFalse(s.syncState.isLoading);
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/notes/push'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'k' });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Sets and resets loading state', () => {
      return assertLoadingState(async () => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        await s.login();

        n.editNote({}, 'title', 'body');

        return s.push();
      });
    });
  });

  describe('unsyncedNoteIds', () => {
    it('new', async () => {
      function assertNotOverwritten() {
        const storedId = Storage.getJson('UNSYNCED')?.new;

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

      await n.getAllNotes();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      const wrapper = shallowMount(NoteMenu);

      assert.isTrue(wrapper.isVisible());

      const statusWrapper = mount(SyncStatus);

      s.pull();

      await nextTick();

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isNull(Storage.getJson('UNSYNCED'));

      // New note mid-pull
      const newButton = getByTestId(wrapper, 'new');
      await newButton.trigger('click');

      await waitUntil(() => !s.syncState.isLoading);

      assertNotOverwritten();

      let storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.strictEqual(storedUnsyncedNoteIds?.new, n.noteState.selectedNote.id);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await s.logout();

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

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
      await waitUntil(() => !s.syncState.isLoading);

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      // See editNote for why we expect selectedNote to be empty
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await newButton.trigger('click');

      assertNotOverwritten();

      n.selectNote(n.noteState.notes[1]!.id);

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

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
      const { promises } = mockApi({
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
      assert.isNull(Storage.getJson('UNSYNCED'));

      const firstCachedNote = { ...n.noteState.selectedNote };

      n.editNote({}, 'title', 'body');

      let storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.strictEqual(storedUnsyncedNoteIds?.edited[0], firstCachedNote.id);

      const statusWrapper = mount(SyncStatus);

      s.pull();

      await nextTick();

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await waitUntil(() => !s.syncState.isLoading);
      await Promise.all(promises);
      await resolveImmediate();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isNull(Storage.getJson('UNSYNCED'));
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

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isTrue(s.syncState.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 1);
      assert.strictEqual(storedUnsyncedNoteIds?.edited[0], secondCachedNote.id);

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(firstCachedNote.id));
      assert.isFalse(s.syncState.unsyncedNoteIds.edited.has(secondCachedNote.id));
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.strictEqual(n.noteState.selectedNote.id, secondCachedNote.id);
      // See editNote for why we don't use selectedNote here
      assert.deepEqual(n.findNote(n.noteState.selectedNote.id)!.content, {
        delta: {},
        title: 'title2',
        body: 'body2',
      });

      n.deleteNote(n.noteState.selectedNote.id);

      await waitUntil(() => !s.syncState.isLoading);

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

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
      assert.isNull(Storage.getJson('UNSYNCED'));

      const firstCachedNote = { ...n.noteState.selectedNote };

      n.deleteNote(n.noteState.selectedNote.id);

      let storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.strictEqual(storedUnsyncedNoteIds?.deleted[0], firstCachedNote.id);

      const statusWrapper = mount(SyncStatus);

      s.pull();

      await nextTick();

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(findByTestId(statusWrapper, 'loading').exists());

      await waitUntil(() => !s.syncState.isLoading);

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());

      const secondCachedNote = { ...n.noteState.selectedNote };

      n.deleteNote(n.noteState.selectedNote.id);

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isTrue(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.strictEqual(s.syncState.unsyncedNoteIds.deleted.size, 1);
      assert.strictEqual(storedUnsyncedNoteIds?.deleted[0], secondCachedNote.id);

      await s.push();

      assert.isTrue(findByTestId(statusWrapper, 'success').exists());
      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(firstCachedNote.id));
      assert.isFalse(s.syncState.unsyncedNoteIds.deleted.has(secondCachedNote.id));
      assert.isNull(Storage.getJson('UNSYNCED'));
    });

    it('Registers unsynced notes if not logged in', async () => {
      mockApi();

      await n.getAllNotes();

      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      n.newNote(true);

      let storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(storedUnsyncedNoteIds?.new, n.noteState.selectedNote.id);
      assert.strictEqual(s.syncState.unsyncedNoteIds.new, n.noteState.selectedNote.id);
      assert.isEmpty(s.syncState.unsyncedNoteIds.edited);
      assert.isEmpty(s.syncState.unsyncedNoteIds.deleted);

      n.editNote({}, 'title', 'body');

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

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

      storedUnsyncedNoteIds = Storage.getJson('UNSYNCED');

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
            '/login': [{ notes: mockDb.encryptedNotes }],
          },
        },
      });

      await n.getAllNotes();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, 1);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assertAppError();
      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(findByTestId(wrapper, 'success').exists());
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes.sort(n.sortNotesFn));
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
    });

    it('No remote, some local', async () => {
      mockApi();

      await n.getAllNotes();

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, localNotes.length);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(findByTestId(wrapper, 'sync-button').exists());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assertAppError();
      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(findByTestId(wrapper, 'success').exists());
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, localNotes);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
    });

    it('No local, no remote', async () => {
      mockApi({
        invoke: {
          resValue: {
            get_all_notes: [[]],
          },
        },
      });

      await n.getAllNotes();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, 1);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(findByTestId(wrapper, 'sync-button').exists());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await s.login();

      assertAppError();
      assert.isFalse(s.syncState.isLoading);
      assert.isTrue(findByTestId(wrapper, 'success').exists());
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isEmpty(s.syncState.unsyncedNoteIds.new);
      assert.strictEqual(s.syncState.unsyncedNoteIds.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
    });
  });
});
