import { mount } from '@vue/test-utils';
import { DefineComponent } from 'vue';

import * as n from '../../store/note';
import * as s from '../../store/sync';
import { mockTauriApi, testTauriListen } from '../tauri';

import App from '../../App.vue';
import Editor from '../../components/Editor.vue';
import Logout from '../../components/Logout.vue';
import NoteMenu from '../../components/NoteMenu.vue';
import SyncStatus from '../../components/SyncStatus.vue';

describe('App', () => {
  it('Mounts', async () => {
    mockTauriApi();

    const getAllNotesSpy = vi.spyOn(n, 'getAllNotes');
    const wrapper = mount(App as DefineComponent);
    assert.isTrue(wrapper.isVisible());

    expect(getAllNotesSpy).toHaveBeenCalledOnce();

    const syncStatusWrapper = wrapper.getComponent(SyncStatus);

    assert.isTrue(wrapper.getComponent(NoteMenu).isVisible());
    assert.isTrue(wrapper.getComponent(Editor).isVisible());
    assert.isTrue(syncStatusWrapper.isVisible());

    await s.login();

    assert.isTrue(wrapper.getComponent(Logout).isVisible());
  });

  it('Listens to Tauri events', () => {
    const listenResults = testTauriListen([
      'tauri://close-requested',
      'reload',
      'new-note',
      'delete-note',
    ]);

    const wrapper = mount(App as DefineComponent);
    assert.isTrue(wrapper.isVisible());

    Object.entries(listenResults).forEach(([event, result]) => {
      if (!result) {
        assert.fail(`Listener for '${event}' not called`);
      }
    });
  });
});
