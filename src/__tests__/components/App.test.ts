import { mount } from '@vue/test-utils';
import { DefineComponent, nextTick } from 'vue';

import { updateDownloading } from '../../store/update';
import { mockTauriApi } from '../tauri';

import App from '../../App.vue';
import Editor from '../../components/Editor.vue';
import Loading from '../../components/Loading.vue';
import NoteMenu from '../../components/NoteMenu.vue';
import SyncStatus from '../../components/SyncStatus.vue';
import UtilityMenu from '../../components/UtilityMenu.vue';

describe('App', () => {
  it('Mounts', async () => {
    mockTauriApi();

    const wrapper = mount(App as DefineComponent);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.getComponent(NoteMenu).isVisible());
    assert.isTrue(wrapper.getComponent(Editor).isVisible());
    assert.isTrue(wrapper.getComponent(UtilityMenu).isVisible());
    assert.isTrue(wrapper.getComponent(SyncStatus).isVisible());
    assert.isFalse(wrapper.findComponent(Loading).exists());

    updateDownloading.value = true;
    await nextTick();

    assert.isTrue(wrapper.getComponent(Loading).isVisible());
  });
});
