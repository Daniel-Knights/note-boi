import { mount, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as a from '../../../api';
import * as auth from '../../../api/auth';
import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import { Encryptor, ERROR_CODE, KeyStore, Storage } from '../../../classes';
import { isEmptyNote, tauriInvoke } from '../../../utils';
import { UUID_REGEX } from '../../constant';
import { clearMockApiResults, mockApi, mockDb, mockKeyring } from '../../mock';
import {
  assertAppError,
  assertLoadingState,
  assertRequest,
  getByTestId,
  getDummyNotes,
  getEncryptedNotes,
  hackEncryptionError,
  immediateDebounceSync,
  waitForAutoSync,
  waitUntil,
} from '../../utils';

import Editor from '../../../components/Editor.vue';
import NoteMenu from '../../../components/NoteMenu.vue';
import SyncStatus from '../../../components/SyncStatus.vue';

describe('Notes (sync)', () => {
  describe('sync', () => {
    it('Syncs notes with the server', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[]] });

      await n.getAllNotes();

      const unsynced = {
        new: 'new',
        edited: ['edited'],
        deleted: [{ uuid: 'deleted', deleted_at: 0 }],
      };

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      s.syncState.unsyncedNotes.set(unsynced);

      const existingNewNote = n.noteState.notes[0]!;

      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(existingNewNote));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(existingNewNote.uuid, n.noteState.selectedNote.uuid);
      assert.deepEqual(Storage.getJson('UNSYNCED'), unsynced);

      clearMockApiResults({ calls });

      mockDb.encryptedNotes = getEncryptedNotes();

      await a.sync();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.deepEqual(
        n.noteState.notes,
        [existingNewNote, ...getDummyNotes()].sort(n.sortNotesFn)
      );
      assert.strictEqual(s.syncState.unsyncedNotes.new, unsynced.new);
      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.deepEqual(Storage.getJson('UNSYNCED'), {
        new: unsynced.new,
        edited: [],
        deleted: [],
      });
      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(calls.size, 5);
      assert.isTrue(calls.request.has('/notes/sync'));
      assertRequest('/notes/sync', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.deepEqual(calls.invoke[2]!.calledWith, { notes: n.noteState.notes });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('Returns if not logged in', async () => {
      const { calls } = mockApi();

      await a.sync();

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(n.noteState.notes.length, 0);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('With encryption error', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      clearMockApiResults({ calls });
      hackEncryptionError(n.noteState.notes[0]!);

      await a.sync();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('With decryption error', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      clearMockApiResults({ calls });

      mockDb.encryptedNotes = [{ uuid: '', timestamp: 0, content: 'Un-deserialisable' }];

      await a.sync();

      assertAppError({
        code: ERROR_CODE.ENCRYPTOR,
        message: 'Note encryption/decryption failed',
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/notes/sync'));
      assertRequest('/notes/sync', calls.request[0]!.calledWith!);
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
      const { calls, setErrorValue } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      clearMockApiResults({ calls });
      setErrorValue.request({ endpoint: '/notes/sync' });

      await a.sync();

      assertAppError({
        code: ERROR_CODE.SYNC,
        message: 'Server error',
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.lengthOf(n.noteState.notes, 1);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes[0]!.uuid, n.noteState.selectedNote.uuid);
      assert.strictEqual(s.syncState.username, 'd');
      assert.isTrue(s.syncState.isLoggedIn);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/sync'));
      assertRequest('/notes/sync', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('Unauthorized', async () => {
      const { calls, setErrorValue } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';
      Storage.set('USERNAME', 'd');

      await a.login();

      clearMockApiResults({ calls });
      setErrorValue.request({ endpoint: '/notes/sync', status: 401 });

      await a.sync();

      assertAppError({
        code: ERROR_CODE.SYNC,
        message: 'Unauthorized',
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/sync'));
      assertRequest('/notes/sync', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    });

    it('User not found', async () => {
      const { calls } = mockApi();

      s.syncState.username = 'k';
      s.syncState.password = '2';
      mockKeyring.k = 'test-token';
      Storage.set('USERNAME', 'k');

      await n.getAllNotes();
      await a.signup();

      clearMockApiResults({ calls });

      delete mockDb.users.k; // Deleted from different device, for example

      await a.sync();

      assertAppError({
        code: ERROR_CODE.SYNC,
        message: 'User not found',
        display: { sync: true },
      });

      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/notes/sync'));
      assertRequest('/notes/sync', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'k' });
    });

    it('Updates editor if selected note is unedited', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      const wrapper = mount(Editor);
      const editorBody = getByTestId(wrapper, 'body');

      assert.isEmpty(editorBody.text());

      await n.getAllNotes();

      assert.include(editorBody.text(), '¯\\_(ツ)_/¯');

      const unencryptedRemoteNotes = getDummyNotes();
      const unencryptedRemoteSelectedNote = unencryptedRemoteNotes.find(
        (nt) => nt.uuid === n.noteState.selectedNote.uuid
      )!;

      // If note exists locally and remotely, timestamps are compared
      unencryptedRemoteSelectedNote.timestamp += 1;
      unencryptedRemoteSelectedNote.content = {
        delta: { ops: [{ insert: 'Remote update' }] },
        title: 'Remote update',
        body: '',
      };

      const passwordKey = await KeyStore.getKey();

      mockDb.encryptedNotes = await Encryptor.encryptNotes(
        unencryptedRemoteNotes,
        passwordKey!
      );

      await a.sync();

      assert.include(editorBody.text(), 'Remote update');
    });

    it('Updates note menu', async () => {
      mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      const wrapper = shallowMount(NoteMenu);

      function assertNoteItemText(uuid: string, text: string) {
        assert.strictEqual(wrapper.get(`[data-note-uuid="${uuid}"]`).text(), text);
      }

      assert.lengthOf(wrapper.findAll('li'), 1);

      await n.getAllNotes();

      assert.lengthOf(wrapper.findAll('li'), 10);
      assertNoteItemText(
        n.noteState.selectedNote.uuid,
        'Note with special characters😬ö'
      );

      const unencryptedRemoteNotes: n.Note[] = getDummyNotes();
      const unencryptedRemoteSelectedNote = unencryptedRemoteNotes.find(
        (nt) => nt.uuid === n.noteState.selectedNote.uuid
      )!;

      // If note exists locally and remotely, timestamps are compared
      unencryptedRemoteSelectedNote.timestamp += 1;
      unencryptedRemoteSelectedNote.content = {
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

      // Deleted remote notes
      mockDb.deletedNotes = unencryptedRemoteNotes
        .splice(5, 2)
        .map((nt) => ({ uuid: nt.uuid, deleted_at: Date.now() }));

      const passwordKey = await KeyStore.getKey();

      mockDb.encryptedNotes = await Encryptor.encryptNotes(
        unencryptedRemoteNotes,
        passwordKey!
      );

      await a.sync();

      assert.lengthOf(wrapper.findAll('li'), 9);
      assertNoteItemText(n.noteState.selectedNote.uuid, 'Remote update-body');
      assertNoteItemText(newRemoteNote.uuid, 'New note-body');
    });

    it('Logs out client-side if no username', async () => {
      const { calls } = mockApi();
      const clientSideLogoutSpy = vi.spyOn(auth, 'clientSideLogout');

      clearMockApiResults({ calls });

      await a.sync();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Logs out client-side if no password key', async () => {
      const { calls } = mockApi();
      const clientSideLogoutSpy = vi.spyOn(auth, 'clientSideLogout');

      s.syncState.username = 'd';

      clearMockApiResults({ calls });

      await a.sync();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });

    it('Logs out client-side if no access token', async () => {
      const { calls } = mockApi();
      const clientSideLogoutSpy = vi.spyOn(auth, 'clientSideLogout');

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();
      await tauriInvoke('delete_access_token', { username: 'd' });

      clearMockApiResults({ calls });

      await a.sync();

      expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isFalse(s.syncState.isLoggedIn);
      assert.isEmpty(s.syncState.username);
      assert.isNull(Storage.get('USERNAME'));
      assert.strictEqual(calls.size, 3);
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

    it('Sets and resets loading state', () => {
      return assertLoadingState(async () => {
        s.syncState.username = 'd';
        s.syncState.password = '1';

        await a.login();
        await a.sync();
      });
    });
  });

  describe('unsyncedNotes', () => {
    it('new', async () => {
      function assertNotOverwritten() {
        const storedUuid = Storage.getJson('UNSYNCED')?.new;

        assert.isNotEmpty(s.syncState.unsyncedNotes.new);
        assert.match(storedUuid || '', UUID_REGEX);
        assert.strictEqual(storedUuid, s.syncState.unsyncedNotes.new);
        assert.strictEqual(storedUuid, n.noteState.notes[0]!.uuid);
        assert.strictEqual(storedUuid, n.noteState.selectedNote.uuid);
        assert.isTrue(isEmptyNote(n.noteState.notes[0]));
        assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      }

      const { calls } = mockApi();

      await n.getAllNotes();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      const wrapper = shallowMount(NoteMenu);

      assert.isTrue(wrapper.isVisible());

      const statusWrapper = mount(SyncStatus);

      mockDb.encryptedNotes = getEncryptedNotes();

      immediateDebounceSync();

      await nextTick();

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(getByTestId(statusWrapper, 'loading').isVisible());
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.isNull(Storage.getJson('UNSYNCED'));

      // New note mid-sync
      const newButton = getByTestId(wrapper, 'new');
      await newButton.trigger('click');
      await waitUntil(() => !s.syncState.loadingCount);

      assertNotOverwritten();

      let storedUnsyncedNotes = Storage.getJson('UNSYNCED');

      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.strictEqual(s.syncState.unsyncedNotes.new, n.noteState.selectedNote.uuid);
      assert.strictEqual(storedUnsyncedNotes?.new, n.noteState.selectedNote.uuid);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      await a.logout();

      storedUnsyncedNotes = Storage.getJson('UNSYNCED');

      assert.isTrue(getByTestId(statusWrapper, 'sync-button').isVisible());
      assert.strictEqual(s.syncState.unsyncedNotes.new, n.noteState.selectedNote.uuid);
      assert.strictEqual(storedUnsyncedNotes?.new, n.noteState.selectedNote.uuid);
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());

      await waitForAutoSync(() => n.editNote({}, 'title', 'body'), calls);

      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));

      await newButton.trigger('click');

      assertNotOverwritten();

      n.selectNote(n.noteState.notes[1]!.uuid);

      storedUnsyncedNotes = Storage.getJson('UNSYNCED');

      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.isNull(storedUnsyncedNotes);
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
    });

    it('edited', async () => {
      const { calls, promises } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      assert.isEmpty(s.syncState.unsyncedNotes.edited);
      assert.isNull(Storage.getJson('UNSYNCED'));

      const firstCachedNote = { ...n.noteState.selectedNote };
      const statusWrapper = mount(SyncStatus);

      clearMockApiResults({ calls, promises });

      // We don't set a res value for this call, because it shouldn't complete
      immediateDebounceSync();

      await nextTick();

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(getByTestId(statusWrapper, 'loading').isVisible());

      await waitForAutoSync(async () => {
        mockDb.encryptedNotes = getEncryptedNotes();
        n.editNote({}, 'title', 'body');

        const storedUnsyncedNotes = Storage.getJson('UNSYNCED');

        assert.isTrue(s.syncState.unsyncedNotes.edited.has(firstCachedNote.uuid));
        assert.strictEqual(storedUnsyncedNotes?.edited[0], firstCachedNote.uuid);

        await nextTick();

        assert.isTrue(getByTestId(statusWrapper, 'loading').isVisible());
        assert.strictEqual(s.syncState.unsyncedNotes.edited.size, 1);
        assert.isTrue(s.syncState.unsyncedNotes.edited.has(firstCachedNote.uuid));
        assert.strictEqual(storedUnsyncedNotes?.edited[0], firstCachedNote.uuid);
        assert.strictEqual(n.noteState.selectedNote.uuid, firstCachedNote.uuid);
        assert.isDefined(n.findNote(firstCachedNote.uuid));
      }, calls);

      assert.isTrue(calls.request.has('/notes/sync'));
      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.isFalse(s.syncState.unsyncedNotes.edited.has(firstCachedNote.uuid));
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.strictEqual(n.noteState.selectedNote.uuid, firstCachedNote.uuid);
      // See `editNote` for why we don't use selectedNote here
      assert.deepEqual(n.findNote(n.noteState.selectedNote.uuid)!.content, {
        delta: {},
        title: 'title',
        body: 'body',
      });

      clearMockApiResults({ calls, promises });

      n.selectNote(n.noteState.notes[1]!.uuid);

      const secondCachedNote = { ...n.noteState.selectedNote };

      await waitForAutoSync(async () => {
        n.editNote({}, 'title2', 'body2');

        const storedUnsyncedNotes = Storage.getJson('UNSYNCED');

        await nextTick();

        assert.isTrue(getByTestId(statusWrapper, 'sync-button').isVisible());
        assert.isFalse(s.syncState.unsyncedNotes.edited.has(firstCachedNote.uuid));
        assert.isTrue(s.syncState.unsyncedNotes.edited.has(secondCachedNote.uuid));
        assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
        assert.strictEqual(storedUnsyncedNotes?.edited[0], secondCachedNote.uuid);
      }, calls);

      assert.isTrue(calls.request.has('/notes/sync'));
      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.isFalse(s.syncState.unsyncedNotes.edited.has(firstCachedNote.uuid));
      assert.isFalse(s.syncState.unsyncedNotes.edited.has(secondCachedNote.uuid));
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.strictEqual(n.noteState.selectedNote.uuid, secondCachedNote.uuid);
      // See `editNote` for why we don't use selectedNote here
      assert.deepEqual(n.findNote(n.noteState.selectedNote.uuid)!.content, {
        delta: {},
        title: 'title2',
        body: 'body2',
      });
    });

    it('deleted', async () => {
      const { calls, promises } = mockApi();

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      assert.isEmpty(s.syncState.unsyncedNotes.deleted);
      assert.isNull(Storage.getJson('UNSYNCED'));

      const firstCachedNote = { ...n.noteState.selectedNote };
      const statusWrapper = mount(SyncStatus);

      clearMockApiResults({ calls, promises });

      // We don't set a res value for this call, because it shouldn't complete
      immediateDebounceSync();

      await nextTick();

      assert.isTrue(statusWrapper.isVisible());
      assert.isTrue(getByTestId(statusWrapper, 'loading').isVisible());

      await waitForAutoSync(async () => {
        mockDb.encryptedNotes = getEncryptedNotes();
        n.deleteNote(n.noteState.selectedNote.uuid);

        const storedUnsyncedNotes = Storage.getJson('UNSYNCED');

        assert.strictEqual(storedUnsyncedNotes?.deleted[0]?.uuid, firstCachedNote.uuid);
        assert.isTrue(
          s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === firstCachedNote.uuid)
        );

        await nextTick();

        assert.isTrue(getByTestId(statusWrapper, 'loading').isVisible());
        assert.strictEqual(s.syncState.unsyncedNotes.deleted.length, 1);
        assert.isTrue(
          s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === firstCachedNote.uuid)
        );
        assert.strictEqual(storedUnsyncedNotes?.deleted[0]?.uuid, firstCachedNote.uuid);
        // Note should be deleted locally
        assert.notStrictEqual(n.noteState.selectedNote.uuid, firstCachedNote.uuid);
        assert.isUndefined(n.findNote(firstCachedNote.uuid));
      }, calls);

      assert.isTrue(calls.request.has('/notes/sync'));
      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.isFalse(
        s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === firstCachedNote.uuid)
      );
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.notStrictEqual(n.noteState.selectedNote.uuid, firstCachedNote.uuid);
      assert.isUndefined(n.findNote(firstCachedNote.uuid));

      clearMockApiResults({ calls, promises });

      const secondCachedNote = { ...n.noteState.selectedNote };

      await waitForAutoSync(async () => {
        n.deleteNote(n.noteState.selectedNote.uuid);

        const storedUnsyncedNotes = Storage.getJson('UNSYNCED');

        await nextTick();

        assert.isTrue(getByTestId(statusWrapper, 'sync-button').isVisible());
        assert.isFalse(
          s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === firstCachedNote.uuid)
        );
        assert.isTrue(
          s.syncState.unsyncedNotes.deleted.some(
            (dn) => dn.uuid === secondCachedNote.uuid
          )
        );
        assert.strictEqual(s.syncState.unsyncedNotes.deleted.length, 1);
        assert.strictEqual(storedUnsyncedNotes?.deleted[0]?.uuid, secondCachedNote.uuid);
      }, calls);

      assert.isTrue(getByTestId(statusWrapper, 'success').isVisible());
      assert.isFalse(
        s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === firstCachedNote.uuid)
      );
      assert.isFalse(
        s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === secondCachedNote.uuid)
      );
      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.notStrictEqual(n.noteState.selectedNote.uuid, firstCachedNote.uuid);
      assert.isUndefined(n.findNote(firstCachedNote.uuid));
    });

    it('Registers unsynced notes if not logged in', async () => {
      const { calls } = mockApi();

      await n.getAllNotes();

      assert.isNull(Storage.getJson('UNSYNCED'));
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.isEmpty(s.syncState.unsyncedNotes.edited);
      assert.isEmpty(s.syncState.unsyncedNotes.deleted);

      n.newNote(true);

      let storedUnsyncedNotes = Storage.getJson('UNSYNCED');

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(storedUnsyncedNotes?.new, n.noteState.selectedNote.uuid);
      assert.strictEqual(s.syncState.unsyncedNotes.new, n.noteState.selectedNote.uuid);
      assert.isEmpty(s.syncState.unsyncedNotes.edited);
      assert.isEmpty(s.syncState.unsyncedNotes.deleted);

      await waitForAutoSync(() => {
        n.editNote({}, 'title', 'body');

        storedUnsyncedNotes = Storage.getJson('UNSYNCED');

        assert.isFalse(isEmptyNote(n.noteState.notes[0]));
        // See `editNote` for why `selectedNote` should be empty
        assert.isTrue(isEmptyNote(n.noteState.selectedNote));
        assert.isEmpty(storedUnsyncedNotes?.new);
        assert.strictEqual(storedUnsyncedNotes?.edited[0], n.noteState.selectedNote.uuid);
        assert.isEmpty(s.syncState.unsyncedNotes.new);
        assert.isTrue(
          s.syncState.unsyncedNotes.edited.has(n.noteState.selectedNote.uuid)
        );
        assert.isEmpty(s.syncState.unsyncedNotes.deleted);
      }, calls);

      const cachedUuid = n.noteState.selectedNote.uuid;

      await waitForAutoSync(() => {
        n.deleteNote(n.noteState.selectedNote.uuid);

        storedUnsyncedNotes = Storage.getJson('UNSYNCED');

        assert.isFalse(isEmptyNote(n.noteState.notes[0]));
        assert.isFalse(isEmptyNote(n.noteState.selectedNote));
        assert.isEmpty(storedUnsyncedNotes?.edited);
        assert.strictEqual(storedUnsyncedNotes?.deleted[0]?.uuid, cachedUuid);
        assert.isEmpty(s.syncState.unsyncedNotes.new);
        assert.isEmpty(s.syncState.unsyncedNotes.edited);
        assert.isTrue(
          s.syncState.unsyncedNotes.deleted.some((dn) => dn.uuid === cachedUuid)
        );
      }, calls);
    });
  });

  describe('Edge cases', () => {
    it('No local, some remote', async () => {
      const { setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[]] });

      await n.getAllNotes();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, 1);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      mockDb.encryptedNotes = getEncryptedNotes();

      await a.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isTrue(getByTestId(wrapper, 'success').isVisible());
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, getDummyNotes().sort(n.sortNotesFn));
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
    });

    it('No remote, some local', async () => {
      mockApi();

      await n.getAllNotes();

      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, getDummyNotes().length);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(getByTestId(wrapper, 'sync-button').isVisible());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isTrue(getByTestId(wrapper, 'success').isVisible());
      assert.isFalse(isEmptyNote(n.noteState.notes[0]));
      assert.isFalse(isEmptyNote(n.noteState.selectedNote));
      assert.deepEqual(n.noteState.notes, getDummyNotes().sort(n.sortNotesFn));
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
    });

    it('No local, no remote', async () => {
      const { setResValues } = mockApi();

      setResValues.invoke({ get_all_notes: [[]] });

      await n.getAllNotes();

      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.lengthOf(n.noteState.notes, 1);

      const wrapper = mount(SyncStatus);

      assert.isTrue(wrapper.isVisible());
      assert.isTrue(getByTestId(wrapper, 'sync-button').isVisible());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      assertAppError();
      assert.strictEqual(s.syncState.loadingCount, 0);
      assert.isTrue(getByTestId(wrapper, 'success').isVisible());
      assert.isTrue(isEmptyNote(n.noteState.notes[0]));
      assert.isTrue(isEmptyNote(n.noteState.selectedNote));
      assert.strictEqual(n.noteState.notes.length, 1);
      assert.isEmpty(s.syncState.unsyncedNotes.new);
      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.isNull(Storage.getJson('UNSYNCED'));
    });
  });
});
