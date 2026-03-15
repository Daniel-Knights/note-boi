import * as a from '../../api';
import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { initApp } from '../../main';
import { clearMockApiResults, mockApi } from '../mock';
import { assertRequest, getAppDiv, resolveImmediate, waitUntil } from '../utils';

// Store original console methods to restore between tests
const originalConsoleMethods = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// Prevent App initialisation from affecting test results
vi.mock('../../App.vue', () => ({
  default: {},
}));

beforeEach(() => {
  const appDiv = getAppDiv();

  document.body.appendChild(appDiv);
});

afterEach(() => {
  // Restore original console methods to prevent nested wrapping by initLogger
  console.log = originalConsoleMethods.log;
  console.debug = originalConsoleMethods.debug;
  console.info = originalConsoleMethods.info;
  console.warn = originalConsoleMethods.warn;
  console.error = originalConsoleMethods.error;
});

describe('main', () => {
  it('Gets all notes, checks for update, syncs notes, and adds listeners', async () => {
    const { calls } = mockApi();
    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const handleUpdateSpy = vi.spyOn(u, 'handleUpdate');
    const queueSyncSpy = vi.spyOn(a, 'queueSync');

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await a.login();

    clearMockApiResults({ calls });

    initApp();
    await waitUntil(() => calls.size >= 23);
    await resolveImmediate(); // Just in case

    expect(getAllNotesSpy).toHaveBeenCalledOnce();
    expect(handleUpdateSpy).toHaveBeenCalledOnce();
    expect(queueSyncSpy).toHaveBeenCalledOnce();

    assert.strictEqual(calls.size, 23);
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
    assert.isTrue(calls.listeners.has('tauri://drag-drop'));
    assert.isTrue(calls.listeners.has('tauri://drag-enter'));
    assert.isTrue(calls.listeners.has('tauri://drag-over'));
    assert.isTrue(calls.listeners.has('tauri://drag-leave'));
    assert.isTrue(calls.listeners.has('reload'));
    assert.isTrue(calls.listeners.has('new-note'));
    assert.isTrue(calls.listeners.has('delete-selected-notes'));
    assert.isTrue(calls.listeners.has('import-notes'));
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

  it('Does not sync if no username is set', async () => {
    const { calls } = mockApi();
    const queueSyncSpy = vi.spyOn(a, 'queueSync');

    s.syncState.username = '';

    clearMockApiResults({ calls });

    initApp();
    await waitUntil(() => calls.invoke.has('get_all_notes'));

    expect(queueSyncSpy).not.toHaveBeenCalled();
    assert.isFalse(calls.request.has('/notes/sync'));
  });
});
