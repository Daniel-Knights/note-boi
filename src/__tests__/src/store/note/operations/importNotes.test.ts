import * as a from '../../../../../api';
import * as n from '../../../../../store/note';
import * as s from '../../../../../store/sync';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { waitForAutoSync, waitUntil } from '../../../../utils';
import {
  mockChangeEventCB,
  mockSelectEventCB,
  mockUnsyncedEventCB,
  setupMockNoteEventListeners,
} from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('importNotes', () => {
  describe('importNotes', () => {
    it('Imports notes', async () => {
      const { calls } = mockApi();
      const paths = ['/foo.json', '/bar.txt'];

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      await n.importNotes(paths);

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, { paths });
    });

    it('Imports notes with no local notes', async () => {
      const { calls } = mockApi();
      const paths = ['/foo.json', '/bar.txt'];

      n.newNote();

      await waitUntil(() => calls.invoke.has('new_note'));

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      await n.importNotes(paths);

      // Once when clearing empty note, once when selecting latest
      expect(mockChangeEventCB).toHaveBeenCalledTimes(2);
      expect(mockSelectEventCB).toHaveBeenCalledTimes(2);
      // Called when clearing empty note
      expect(mockUnsyncedEventCB).toHaveBeenCalledOnce();

      // One of these is the cleared new note (marked as deleted),
      // other two are imported (marked as edited)
      assert.strictEqual(s.syncState.unsyncedNotes.size, 3);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, { paths });
      assert.isTrue(calls.invoke.has('delete_note'));
    });

    it('Imports notes and syncs them', async () => {
      const { calls } = mockApi();
      const paths = ['/foo.json', '/bar.txt'];

      s.syncState.username = 'd';
      s.syncState.password = '1';

      await a.login();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      await waitForAutoSync(() => n.importNotes(paths), calls);

      // Once when clearing empty note, once when selecting latest
      expect(mockChangeEventCB).toHaveBeenCalledTimes(2);
      expect(mockSelectEventCB).toHaveBeenCalledTimes(2);
      expect(mockUnsyncedEventCB).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 7);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, { paths });
      assert.isTrue(calls.invoke.has('delete_note'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.isTrue(calls.request.has('/notes/sync'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]?.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('Returns when passed no paths', async () => {
      const { calls } = mockApi();

      await n.importNotes([]);

      expect(mockChangeEventCB).not.toHaveBeenCalled();
      expect(mockSelectEventCB).not.toHaveBeenCalled();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 0);
    });

    it('Handles import errors', async () => {
      const { calls, setErrorValue } = mockApi();
      const paths = ['/foo.json'];

      setErrorValue.invoke('import_notes');

      await n.importNotes(paths);

      expect(mockChangeEventCB).not.toHaveBeenCalled();
      expect(mockSelectEventCB).not.toHaveBeenCalled();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 1);
      // `tauriInvoke` catch
      assert.isTrue(calls.tauriApi.has('plugin:dialog|message'));
      assert.strictEqual(calls.tauriApi[0]?.calledWith?.kind, 'error');
    });
  });

  describe('importNotesFromFileChooser', () => {
    it('Opens file chooser and imports one note', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.tauriApi({ openDialog: ['/test.json'] });

      await n.importNotesFromFileChooser();

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.invoke.has('import_notes'));
    });

    it('Opens file chooser and imports multiple notes', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.tauriApi({ openDialog: [['/test1.json', '/test2.txt']] });

      await n.importNotesFromFileChooser();

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, {
        paths: ['/test1.json', '/test2.txt'],
      });
    });

    it('Returns on no selected files', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.tauriApi({ openDialog: [''] });

      await n.importNotesFromFileChooser();

      expect(mockChangeEventCB).not.toHaveBeenCalled();
      expect(mockSelectEventCB).not.toHaveBeenCalled();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    });
  });

  describe('handleImportNotesDragDrop', () => {
    it('Adds and removes body class on enter, leave, and drop', () => {
      n.handleImportNotesDragDrop({
        // @ts-expect-error - don't need the full object here
        payload: { type: 'enter', paths: [] },
      });

      assert.isTrue(document.body.classList.contains('dragging-file'));

      n.handleImportNotesDragDrop({
        // @ts-expect-error - don't need the full object here
        payload: { type: 'leave', paths: [] },
      });

      assert.isFalse(document.body.classList.contains('dragging-file'));

      document.body.classList.add('dragging-file');

      n.handleImportNotesDragDrop({
        // @ts-expect-error - don't need the full object here
        payload: { type: 'drop', paths: [] },
      });

      assert.isFalse(document.body.classList.contains('dragging-file'));
    });

    it('Imports dropped notes', async () => {
      const { calls } = mockApi();

      await waitForAutoSync(() => {
        n.handleImportNotesDragDrop({
          // @ts-expect-error - don't need the full object here
          payload: {
            type: 'drop',
            paths: ['/test.json', '/test.txt'],
          },
        });
      }, calls);

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, {
        paths: ['/test.json', '/test.txt'],
      });
    });

    it('Filters out unaccepted file extensions', async () => {
      const { calls } = mockApi();

      await waitForAutoSync(() => {
        n.handleImportNotesDragDrop({
          // @ts-expect-error - don't need the full object here
          payload: {
            type: 'drop',
            paths: ['/test.json', '/test.pdf', '/test.txt', '/test.doc'],
          },
        });
      }, calls);

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.invoke.has('import_notes'));
      // Should only include .json and .txt files
      assert.deepEqual(calls.invoke[0]?.calledWith, {
        paths: ['/test.json', '/test.txt'],
      });
    });

    it('Returns when there are no valid paths', () => {
      const { calls } = mockApi();

      n.handleImportNotesDragDrop({
        // @ts-expect-error - don't need the full object here
        payload: {
          type: 'drop',
          paths: ['/test.pdf', '/test.doc', '/test.png'],
        },
      });

      expect(mockChangeEventCB).not.toHaveBeenCalled();
      expect(mockSelectEventCB).not.toHaveBeenCalled();
      expect(mockUnsyncedEventCB).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 0);
    });
  });
});
