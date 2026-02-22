import * as a from '../../../../../api';
import * as n from '../../../../../store/note';
import * as s from '../../../../../store/sync';
import { clearMockApiResults, mockApi } from '../../../../mock';
import { wait, waitForAutoSync } from '../../../../utils';
import {
  mockChangeEventCB,
  mockSelectEventCB,
  setupMockNoteEventListeners,
} from '../setup';

beforeAll(() => {
  setupMockNoteEventListeners();
});

describe('importNotes', () => {
  describe('importNotesFromPaths/importNotesToState', () => {
    it('Imports notes', async () => {
      const { calls } = mockApi();
      const paths = ['/foo.json', '/bar.txt'];

      await n.getAllNotes();

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      const importedNotes = await n.importNotesFromPaths(paths);
      n.importNotesToState(importedNotes!);

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, { paths });
    });

    it('Imports notes with no local notes', async () => {
      const { calls } = mockApi();
      const paths = ['/foo.json', '/bar.txt'];

      n.newNote();

      // Wait 1ms to ensure imported notes have newer timestamps
      await wait(1);

      vi.clearAllMocks();
      clearMockApiResults({ calls });

      const importedNotes = await n.importNotesFromPaths(paths);
      n.importNotesToState(importedNotes!);

      // Once when clearing empty note, once when selecting latest
      expect(mockChangeEventCB).toHaveBeenCalledTimes(2);
      expect(mockSelectEventCB).toHaveBeenCalledTimes(2);

      // One of these is the cleared new note (marked as deleted),
      // other two are imported (marked as edited)
      assert.strictEqual(s.syncState.unsyncedNotes.size, 3);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
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

      await waitForAutoSync(async () => {
        const importedNotes = await n.importNotesFromPaths(paths);

        n.importNotesToState(importedNotes!);
      }, calls);

      // Once when clearing empty note, once when selecting latest
      expect(mockChangeEventCB).toHaveBeenCalledTimes(2);
      expect(mockSelectEventCB).toHaveBeenCalledTimes(2);

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 8);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes', 2));
      assert.deepEqual(calls.invoke[0]?.calledWith, { paths });
      assert.isTrue(calls.invoke.has('delete_note'));
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.isTrue(calls.invoke.has('set_access_token'));
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
      const importedNotes = await n.importNotesFromPaths([]);

      n.importNotesToState(importedNotes!);

      expect(mockChangeEventCB).not.toHaveBeenCalled();
      expect(mockSelectEventCB).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 0);
    });
  });

  describe('importNotesFromFileChooser', () => {
    it('Opens file chooser and imports one note', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.tauriApi({ openDialog: ['/test.json'] });

      await n.importNotesFromFileChooser();

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 1);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
    });

    it('Opens file chooser and imports multiple notes', async () => {
      const { calls, setResValues } = mockApi();

      setResValues.tauriApi({ openDialog: [['/test1.json', '/test2.txt']] });

      await n.importNotesFromFileChooser();

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
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

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    });
  });

  describe('handleImportNotesDragDrop', () => {
    it('Adds and removes body class on enter, leave, and drop', () => {
      n.handleImportNotesDragDrop('enter', { paths: [] });

      assert.isTrue(document.body.classList.contains('dragging-file'));

      n.handleImportNotesDragDrop('leave', { paths: [] });

      assert.isFalse(document.body.classList.contains('dragging-file'));

      document.body.classList.add('dragging-file');

      n.handleImportNotesDragDrop('drop', { paths: [] });

      assert.isFalse(document.body.classList.contains('dragging-file'));
    });

    it('Imports dropped notes', async () => {
      const { calls } = mockApi();

      await waitForAutoSync(() => {
        n.handleImportNotesDragDrop('drop', {
          paths: ['/test.json', '/test.txt'],
        });
      }, calls);

      expect(mockChangeEventCB).toHaveBeenCalledOnce();
      expect(mockSelectEventCB).toHaveBeenCalledOnce();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.deepEqual(calls.invoke[0]?.calledWith, {
        paths: ['/test.json', '/test.txt'],
      });
    });

    it('Filters out unaccepted file extensions', async () => {
      const { calls } = mockApi();

      await waitForAutoSync(() => {
        n.handleImportNotesDragDrop('drop', {
          paths: ['/test.json', '/test.pdf', '/test.txt', '/test.doc'],
        });
      }, calls);

      assert.strictEqual(s.syncState.unsyncedNotes.size, 2);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.invoke.has('import_notes'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      // Should only include .json and .txt files
      assert.deepEqual(calls.invoke[0]?.calledWith, {
        paths: ['/test.json', '/test.txt'],
      });
    });

    it('Returns when there are no valid paths', () => {
      const { calls } = mockApi();

      n.handleImportNotesDragDrop('drop', {
        paths: ['/test.pdf', '/test.doc', '/test.png'],
      });

      expect(mockChangeEventCB).not.toHaveBeenCalled();
      expect(mockSelectEventCB).not.toHaveBeenCalled();

      assert.strictEqual(s.syncState.unsyncedNotes.size, 0);
      assert.strictEqual(calls.size, 0);
    });
  });
});
