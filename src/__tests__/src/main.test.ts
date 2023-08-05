import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { openedPopup, PopupType } from '../../store/popup';
import { mockApi } from '../api';

let main: typeof import('../../main');

beforeEach(() => {
  const div = document.createElement('div');
  div.id = 'app';
  document.body.appendChild(div);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('main', () => {
  it('Gets all notes, checks for update, and adds listeners', async () => {
    const { calls, events } = mockApi();
    const spyGetAllNotes = vi.spyOn(n, 'getAllNotes');
    const spyHandleUpdate = vi.spyOn(u, 'handleUpdate');

    main = await import('../../main');

    expect(spyGetAllNotes).toHaveBeenCalledOnce();
    expect(spyHandleUpdate).toHaveBeenCalledOnce();

    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('get_all_notes'));
    assert.strictEqual(events.emits.length, 1);
    assert.isTrue(events.emits.includes('tauri://update'));
    assert.strictEqual(events.listeners.length, 10);
    assert.isTrue(events.listeners.includes('tauri://update-available'));
    assert.isTrue(events.listeners.includes('tauri://update-status'));
    assert.isTrue(events.listeners.includes('tauri://close-requested'));
    assert.isTrue(events.listeners.includes('reload'));
    assert.isTrue(events.listeners.includes('new-note'));
    assert.isTrue(events.listeners.includes('delete-note'));
    assert.isTrue(events.listeners.includes('export-note'));
    assert.isTrue(events.listeners.includes('export-all-notes'));
    assert.isTrue(events.listeners.includes('delete-account'));
    assert.isTrue(events.listeners.includes('change-password'));
  });

  describe('exitApp', () => {
    it('With no unsynced notes', async () => {
      const { calls, events } = mockApi();
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(spyPush).not.toHaveBeenCalled();
      assert.strictEqual(calls.length, 0);
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it('With unsynced notes', async () => {
      const { calls, events } = mockApi();
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(spyPush).toHaveBeenCalledOnce();
      assert.strictEqual(calls.length, 0);
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
    });

    it('Triggers ask dialog on push error, and answers "No"', async () => {
      const { calls, events } = mockApi({ api: { resValue: false } });
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.error.type = s.ErrorType.Push;

      await main.exitApp(mockCb);

      expect(mockCb).not.toHaveBeenCalledOnce();
      expect(spyPush).toHaveBeenCalledOnce();
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('askDialog'));

      if (!calls[0].calledWith || !('message' in calls[0].calledWith)) {
        assert.fail();
      }

      assert.strictEqual(
        calls[0].calledWith!.message,
        'ERROR: Failed to push unsynced notes.\nClose anyway?'
      );
      assert.strictEqual(calls[0].calledWith!.title, 'NoteBoi');
      assert.strictEqual(calls[0].calledWith!.type, 'error');
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
      assert.strictEqual(openedPopup.value, PopupType.Error);
    });

    it('Triggers ask dialog on push error, and answers "Yes"', async () => {
      const { calls, events } = mockApi();
      const mockCb = vi.fn();
      const spyPush = vi.spyOn(s, 'push');

      s.syncState.unsyncedNoteIds.edited.add('1');
      s.syncState.error.type = s.ErrorType.Push;
      // Setting openedPopup to undefined emits this component's close event
      // and resets syncState.error, so we mock it to prevent that
      vi.mock('../../components/SyncStatus.vue');
      openedPopup.value = undefined;

      await main.exitApp(mockCb);

      expect(mockCb).toHaveBeenCalledOnce();
      expect(spyPush).toHaveBeenCalledOnce();
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('askDialog'));

      if (!calls[0].calledWith || !('message' in calls[0].calledWith)) {
        assert.fail();
      }

      assert.strictEqual(
        calls[0].calledWith.message,
        'ERROR: Failed to push unsynced notes.\nClose anyway?'
      );
      assert.strictEqual(calls[0].calledWith.title, 'NoteBoi');
      assert.strictEqual(calls[0].calledWith.type, 'error');
      assert.strictEqual(events.emits.length, 0);
      assert.strictEqual(events.listeners.length, 0);
      assert.isUndefined(openedPopup.value);
    });
  });
});
