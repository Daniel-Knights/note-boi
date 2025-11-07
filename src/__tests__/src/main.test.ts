import * as a from '../../api';
import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as u from '../../store/update';
import { clearMockApiResults, mockApi } from '../mock';
import { assertRequest, getAppDiv, resolveImmediate, waitUntil } from '../utils';

beforeEach(() => {
  const appDiv = getAppDiv();

  document.body.appendChild(appDiv);
});

describe('main', () => {
  it('Gets all notes, checks for update, syncs notes, and adds listeners', async () => {
    const { calls } = mockApi();
    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const handleUpdateSpy = vi.spyOn(u, 'handleUpdate');
    const syncSpy = vi.spyOn(a, 'debounceSync');

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await a.login();

    clearMockApiResults({ calls });

    await import('../../main');
    await waitUntil(() => calls.size >= 23);
    await resolveImmediate(); // Just in case

    expect(getAllNotesSpy).toHaveBeenCalledOnce();
    expect(handleUpdateSpy).toHaveBeenCalledOnce();
    expect(syncSpy).toHaveBeenCalledOnce();

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
    assert.isTrue(calls.listeners.has('delete-note'));
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
});
