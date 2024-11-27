import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { AppError, ERROR_CODE } from '../../appError';
import { openedPopup, PopupType } from '../../store/popup';
import { mockApi } from '../api';
import { getAppDiv, waitUntil } from '../utils';

let main: typeof import('../../main');

beforeEach(() => {
  const appDiv = getAppDiv();

  document.body.appendChild(appDiv);
});

describe('main', () => {
  it('Gets all notes, checks for update, and adds listeners', async () => {
    const { calls } = mockApi();
    const spyGetAllNotes = vi.spyOn(n, 'getAllNotes');
    const spyHandleUpdate = vi.spyOn(u, 'handleUpdate');

    main = await import('../../main');

    await waitUntil(() => calls.size >= 13);

    expect(spyGetAllNotes).toHaveBeenCalledOnce();
    expect(spyHandleUpdate).toHaveBeenCalledOnce();

    assert.strictEqual(calls.size, 13);
    assert.isTrue(calls.invoke.has('get_all_notes'));
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
  });

  describe('exitApp', () => {
    it('With no unsynced notes', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(spyPush).not.toHaveBeenCalled();
      assert.strictEqual(calls.size, 0);
    });

    it('With unsynced notes', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(spyPush).toHaveBeenCalledOnce();
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
      const spyPush = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.appError = new AppError({ code: ERROR_CODE.PUSH });

      await main.exitApp(mockCb);

      expect(mockCb).not.toHaveBeenCalledOnce();
      expect(spyPush).toHaveBeenCalledOnce();
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));

      const askDialogCalledWith = calls.tauriApi[0]!.calledWith as Record<
        string,
        unknown
      >;

      assert.strictEqual(
        askDialogCalledWith.message,
        'ERROR: Failed to push unsynced notes.\nClose anyway?'
      );
      assert.strictEqual(askDialogCalledWith.title, 'NoteBoi');
      assert.strictEqual(askDialogCalledWith.kind, 'error');
      assert.strictEqual(openedPopup.value, PopupType.Error);
    });

    it('Triggers ask dialog on push error, and answers "Yes"', async () => {
      const { calls } = mockApi();
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.appError = new AppError({ code: ERROR_CODE.PUSH });

      // Setting openedPopup to undefined emits this component's close event
      // and resets syncState.error, so we mock it to prevent that
      vi.mock('../../components/SyncStatus.vue');

      openedPopup.value = undefined;

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(spyPush).toHaveBeenCalledOnce();
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));

      const askDialogCalledWith = calls.tauriApi[0]!.calledWith as Record<
        string,
        unknown
      >;

      assert.strictEqual(
        askDialogCalledWith.message,
        'ERROR: Failed to push unsynced notes.\nClose anyway?'
      );
      assert.strictEqual(askDialogCalledWith.title, 'NoteBoi');
      assert.strictEqual(askDialogCalledWith.kind, 'error');
      assert.isUndefined(openedPopup.value);
    });
  });
});
