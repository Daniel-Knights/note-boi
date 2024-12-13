import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { AppError, ERROR_CODE } from '../../classes';
import { openedPopup, PopupType } from '../../store/popup';
import { tauriInvoke } from '../../utils';
import { clearMockApiResults, mockApi } from '../api';
import { getAppDiv, resolveImmediate, waitUntil } from '../utils';

let main: typeof import('../../main');

beforeEach(() => {
  const appDiv = getAppDiv();

  document.body.appendChild(appDiv);
});

describe('main', () => {
  it('Gets all notes, checks for update, pulls notes, and adds listeners', async () => {
    const { calls } = mockApi();
    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const handleUpdateSpy = vi.spyOn(u, 'handleUpdate');
    const pullSpy = vi.spyOn(s, 'pull');

    s.syncState.username = 'd';

    await tauriInvoke('set_access_token', {
      username: 'd',
      accessToken: 'test-token',
    });

    clearMockApiResults({ calls });

    main = await import('../../main');

    await waitUntil(() => calls.size >= 18);
    await resolveImmediate(); // Just in case

    expect(getAllNotesSpy).toHaveBeenCalledOnce();
    expect(handleUpdateSpy).toHaveBeenCalledOnce();
    expect(pullSpy).toHaveBeenCalledOnce();

    assert.strictEqual(calls.size, 18);
    assert.isTrue(calls.request.has('/notes/pull'));
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
      const pushSpy = vi.spyOn(s, 'push');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(pushSpy).not.toHaveBeenCalled();

      assert.strictEqual(calls.size, 0);
    });

    it('With unsynced notes', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const pushSpy = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(pushSpy).toHaveBeenCalledOnce();

      assert.strictEqual(calls.size, 0);
    });

    it('Triggers ask dialog on push error, and answers "No"', async () => {
      const { calls } = mockApi({
        tauriApi: {
          resValue: {
            askDialog: [false],
          },
        },
      });
      const mockCb = vi.fn();
      const pushSpy = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.appError = new AppError({ code: ERROR_CODE.PUSH });

      await main.exitApp(mockCb);

      expect(mockCb).not.toHaveBeenCalledOnce();
      expect(pushSpy).toHaveBeenCalledOnce();

      assert.strictEqual(openedPopup.value, PopupType.Error);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message: 'ERROR: Failed to push unsynced notes.\nClose anyway?',
        title: 'NoteBoi',
        kind: 'error',
      });
    });

    it('Triggers ask dialog on push error, and answers "Yes"', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const pushSpy = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.appError = new AppError({ code: ERROR_CODE.PUSH });

      // Setting openedPopup to undefined emits this component's close event
      // and resets syncState.error, so we mock it to prevent that
      vi.mock('../../components/SyncStatus.vue');

      openedPopup.value = undefined;

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(pushSpy).toHaveBeenCalledOnce();

      assert.isUndefined(openedPopup.value);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message: 'ERROR: Failed to push unsynced notes.\nClose anyway?',
        title: 'NoteBoi',
        kind: 'error',
      });
    });
  });
});
