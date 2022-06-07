import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as n from '../../store/note';
import * as s from '../../store/sync';
import { mockTauriApi, testTauriListen } from '../tauri';
import { resetSyncStore, setCrypto } from '../utils';

import App from '../../App.vue';

beforeAll(setCrypto);
beforeEach(resetSyncStore);
enableAutoUnmount(afterEach);

describe('App', () => {
  it('Mounts', async () => {
    await mockTauriApi();

    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const wrapper = mount(App);
    assert.isTrue(wrapper.isVisible());

    expect(getAllNotesSpy).toHaveBeenCalled();

    const syncStatusWrapper = wrapper.getComponent({ name: 'SyncStatus' });

    assert.isTrue(wrapper.getComponent({ name: 'NoteMenu' }).isVisible());
    assert.isTrue(wrapper.getComponent({ name: 'Editor' }).isVisible());
    assert.isTrue(syncStatusWrapper.isVisible());

    await s.login();

    assert.isTrue(wrapper.getComponent({ name: 'Logout' }).isVisible());
  });

  it('Listens to Tauri events', () => {
    const listenResults = testTauriListen([
      'tauri://close-requested',
      'reload',
      'new-note',
      'delete-note',
    ]);

    const wrapper = mount(App);
    assert.isTrue(wrapper.isVisible());

    Object.entries(listenResults).forEach(([event, result]) => {
      if (!result) {
        assert.fail(`Listener for '${event}' not called`);
      }
    });
  });
});
