import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { updateDownloading } from '../../../store/update';
import { mockApi } from '../../api';

import App from '../../../App.vue';
import Editor from '../../../components/Editor.vue';
import Loading from '../../../components/Loading.vue';
import NoteMenu from '../../../components/NoteMenu.vue';
import SyncStatus from '../../../components/SyncStatus.vue';
import UtilityMenu from '../../../components/UtilityMenu.vue';

describe('App', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(App);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.getComponent(NoteMenu).isVisible());
    assert.isTrue(wrapper.getComponent(Editor).isVisible());
    assert.isTrue(wrapper.getComponent(UtilityMenu).isVisible());
    assert.isTrue(wrapper.getComponent(SyncStatus).isVisible());
    assert.isFalse(wrapper.findComponent(Loading).exists());
    assert.strictEqual(calls.size, 4);
    assert.isTrue(calls.emits.has('logout'));
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('logout'));
    assert.isTrue(calls.listeners.has('signup'));
  });

  it('Shows loading spinner when update is downloading', async () => {
    mockApi();

    const wrapper = mount(App);

    updateDownloading.value = true;
    await nextTick();

    assert.isTrue(wrapper.getComponent(Loading).isVisible());
  });
});
