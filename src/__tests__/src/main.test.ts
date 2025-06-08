import * as a from '../../api';
import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { AppError, ERROR_CODE } from '../../classes';
import { openedPopup, POPUP_TYPE } from '../../store/popup';
import { clearMockApiResults, mockApi } from '../mock';
import { assertRequest, getAppDiv, resolveImmediate, waitUntil } from '../utils';

let main: typeof import('../../main');

beforeEach(() => {
  const appDiv = getAppDiv();

  document.body.appendChild(appDiv);
});

describe('main', () => {
  it('Gets all notes, checks for update, syncs notes, and adds listeners', async () => {
    const { calls } = mockApi();
    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const handleUpdateSpy = vi.spyOn(u, 'handleUpdate');
    const syncSpy = vi.spyOn(a, 'sync');

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await a.login();

    clearMockApiResults({ calls });

    main = await import('../../main');

    await waitUntil(() => calls.size >= 18);
    await resolveImmediate(); // Just in case

    expect(getAllNotesSpy).toHaveBeenCalledOnce();
    expect(handleUpdateSpy).toHaveBeenCalledOnce();
    expect(syncSpy).toHaveBeenCalledOnce();

    assert.strictEqual(calls.size, 18);
    assert.isTrue(calls.request.has('/notes/sync'));
    assertRequest('/notes/sync', calls.request[0]!.calledWith!);
    assert.isTrue(calls.invoke.has('get_all_notes'));
    assert.isTrue(calls.invoke.has('get_access_token'));
    assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'd' });
    assert.isTrue(calls.invoke.has('set_access_token'));
    assert.deepEqual(calls.invoke[2]!.calledWith, {
      username: 'd',
      accessToken: 'test-token',
    });
    assert.isTrue(calls.invoke.has('sync_local_notes'));
    assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
    assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
    assert.isTrue(calls.tauriApi.has('plugin:updater|download_and_install'));
    assert.isTrue(calls.tauriApi.has('plugin:process|restart'));
    assert.isTrue(calls.listeners.has('tauri://close-requested'));
    assert.isTrue(calls.listeners.has('reload'));
    assert.isTrue(calls.listeners.has('new-note'));
    assert.isTrue(calls.listeners.has('delete-note'));
    assert.isTrue(calls.listeners.has('export-note'));
    assert.isTrue(calls.listeners.has('export-all-notes'));
    assert.isTrue(calls.listeners.has('delete-account'));
    assert.isTrue(calls.listeners.has('change-password'));
    assert.isTrue(calls.emits.has('auth'));
    assert.deepEqual(calls.emits[0]!.calledWith, {
      isFrontendEmit: true,
      data: {
        is_logged_in: true,
      },
    });
  });

  describe('exitApp', () => {
    it('With no unsynced notes', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const syncSpy = vi.spyOn(a, 'sync');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(syncSpy).not.toHaveBeenCalled();

      assert.strictEqual(calls.size, 0);
    });

    it('With unsynced notes', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const syncSpy = vi.spyOn(a, 'sync');

      s.syncState.unsyncedNoteIds.edited.add('1');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(syncSpy).toHaveBeenCalledOnce();

      assert.strictEqual(calls.size, 0);
    });

    it('Triggers ask dialog on sync error, and answers "No"', async () => {
      const { calls, setResValues } = mockApi();
      const mockCb = vi.fn();
      const syncSpy = vi.spyOn(a, 'sync');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.appError = new AppError({ code: ERROR_CODE.SYNC });

      setResValues.tauriApi({ askDialog: [false] });

      await main.exitApp(mockCb);

      expect(mockCb).not.toHaveBeenCalledOnce();
      expect(syncSpy).toHaveBeenCalledOnce();

      assert.strictEqual(openedPopup.value, POPUP_TYPE.ERROR);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message: 'ERROR: Failed to sync notes.\nClose anyway?',
        title: 'NoteBoi',
        kind: 'error',
      });
    });

    it('Triggers ask dialog on sync error, and answers "Yes"', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const syncSpy = vi.spyOn(a, 'sync');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.appError = new AppError({ code: ERROR_CODE.SYNC });

      // Setting openedPopup to undefined emits this component's close event
      // and resets syncState.error, so we mock it to prevent that
      vi.mock('../../components/SyncStatus.vue');

      openedPopup.value = undefined;

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(syncSpy).toHaveBeenCalledOnce();

      assert.isUndefined(openedPopup.value);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message: 'ERROR: Failed to sync notes.\nClose anyway?',
        title: 'NoteBoi',
        kind: 'error',
      });
    });
  });
});
