import { mockIPC } from '@tauri-apps/api/mocks';

import * as n from '../store/note';
import * as s from '../store/sync';
import * as u from '../store/update';
import { openedPopup, PopupType } from '../store/popup';

import { mockTauriApi, testTauriListen } from './tauri';
import { mockPromise } from './utils';

type ArgsMessage = {
  cmd: string;
  message: string;
  title: string;
  type: string;
};

function* mockAskDialog(resValue: boolean): Generator<ArgsMessage | void, void> {
  let askDialogCalledWith: ArgsMessage | undefined;

  yield mockIPC((cmd, args) => {
    if (cmd !== 'tauri') return;

    const message = args.message as {
      cmd: string;
      message: string;
      title: string;
      type: string;
    };

    if (message.cmd === 'askDialog') {
      askDialogCalledWith = message;

      return mockPromise(resValue);
    }
  });

  yield askDialogCalledWith;
}

beforeEach(() => {
  mockTauriApi();

  const div = document.createElement('div');
  div.id = 'app';
  document.body.appendChild(div);
});

describe('main', () => {
  it('Gets all notes, checks for update, and adds listeners', async () => {
    const spyGetAllNotes = vi.spyOn(n, 'getAllNotes');
    const spyHandleUpdate = vi.spyOn(u, 'handleUpdate');

    const listenResults = testTauriListen([
      'tauri://close-requested',
      'reload',
      'new-note',
      'delete-note',
    ]);

    await import('../main');

    expect(spyGetAllNotes).toHaveBeenCalledOnce();
    expect(spyHandleUpdate).toHaveBeenCalledOnce();

    Object.entries(listenResults).forEach(([event, result]) => {
      if (!result) {
        assert.fail(`Listener for '${event}' not called`);
      }
    });
  });

  it('exitApp', async () => {
    const main = await import('../main');
    const mockCb = vi.fn();
    const spyExitApp = vi.spyOn(main, 'exitApp');
    const spyPush = vi.spyOn(s, 'push');

    await main.exitApp(mockCb);

    expect(spyExitApp).toHaveBeenCalledOnce();
    expect(mockCb).toHaveBeenCalledOnce();
    expect(spyPush).not.toHaveBeenCalled();

    vi.clearAllMocks();

    s.syncState.unsyncedNoteIds.edited.add('1');

    await main.exitApp(mockCb);

    expect(spyExitApp).toHaveBeenCalledOnce();
    expect(spyPush).toHaveBeenCalledOnce();
    expect(mockCb).toHaveBeenCalledOnce();

    vi.clearAllMocks();

    s.syncState.unsyncedNoteIds.edited.add('1');
    s.syncState.error.type = s.ErrorType.Push;

    const mockGen = mockAskDialog(false);
    mockGen.next();

    await main.exitApp(mockCb);

    const askDialogCalledWith = mockGen.next().value;

    expect(spyExitApp).toHaveBeenCalledOnce();
    expect(spyPush).toHaveBeenCalledOnce();
    assert.isDefined(askDialogCalledWith);
    assert.strictEqual(
      askDialogCalledWith!.message,
      'ERROR: Failed to push unsynced notes.\nClose anyway?'
    );
    assert.strictEqual(askDialogCalledWith!.title, 'NoteBoi');
    assert.strictEqual(askDialogCalledWith!.type, 'error');
    expect(mockCb).not.toHaveBeenCalledOnce();
    assert.strictEqual(openedPopup.value, PopupType.Error);

    vi.clearAllMocks();

    s.syncState.unsyncedNoteIds.edited.add('1');
    s.syncState.error.type = s.ErrorType.Push;
    // Setting openedPopup to undefined emits this component's close event
    // and resets syncState.error, so we mock it to prevent that
    vi.mock('../components/SyncStatus.vue');
    openedPopup.value = undefined;

    const mockGen2 = mockAskDialog(true);
    mockGen2.next();

    await main.exitApp(mockCb);

    const askDialogCalledWith2 = mockGen2.next().value;

    expect(spyExitApp).toHaveBeenCalledOnce();
    expect(spyPush).toHaveBeenCalledOnce();
    assert.isDefined(askDialogCalledWith2);
    assert.strictEqual(
      askDialogCalledWith2!.message,
      'ERROR: Failed to push unsynced notes.\nClose anyway?'
    );
    assert.strictEqual(askDialogCalledWith2!.title, 'NoteBoi');
    assert.strictEqual(askDialogCalledWith2!.type, 'error');
    expect(mockCb).toHaveBeenCalledOnce();
    assert.isUndefined(openedPopup.value);
  });
});
