import { mount } from '@vue/test-utils';

import { mockTauriApi, testTauriListen } from '../tauri';
import { resetSyncStore, setCrypto } from '../utils';
import * as n from '../../store/note';
import * as s from '../../store/sync';

import App from '../../App.vue';

beforeAll(setCrypto);
beforeEach(resetSyncStore);

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

  it('Handles popup toggling', async () => {
    await mockTauriApi();

    const wrapper = mount(App);
    const wrapperVm = wrapper.vm as unknown as {
      popup: { auth: boolean; error: boolean };
      closeSyncPopup: (popupType: string) => void;
    };
    assert.isTrue(wrapper.isVisible());

    const syncStatusWrapper = wrapper.getComponent({ name: 'SyncStatus' });

    s.state.error.type = s.ErrorType.Auth;
    syncStatusWrapper.vm.emit('popup-auth');
    assert.isTrue(wrapperVm.popup.auth);
    wrapperVm.closeSyncPopup('auth');
    assert.isFalse(wrapperVm.popup.auth);
    assert.strictEqual(s.state.error.type, s.ErrorType.None);

    s.state.error.type = s.ErrorType.Auth;
    syncStatusWrapper.vm.emit('popup-error');
    assert.isTrue(wrapperVm.popup.error);
    wrapperVm.closeSyncPopup('error');
    assert.isFalse(wrapperVm.popup.error);
    assert.strictEqual(s.state.error.type, s.ErrorType.None);
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
