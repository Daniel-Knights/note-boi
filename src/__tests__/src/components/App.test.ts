import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { updateState } from '../../../store/update';
import { mockApi } from '../../mock';

import App from '../../../App.vue';
import Editor from '../../../components/Editor.vue';
import Loading from '../../../components/Loading.vue';
import NoteMenu from '../../../components/NoteMenu.vue';
import NoteMenuToggle from '../../../components/NoteMenuToggle.vue';
import SyncStatus from '../../../components/SyncStatus.vue';

describe('App', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(App);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.getComponent(NoteMenu).isVisible());
    assert.isTrue(wrapper.getComponent(Editor).isVisible());
    assert.isTrue(wrapper.getComponent(SyncStatus).isVisible());
    assert.isFalse(wrapper.findComponent(Loading).exists());
    assert.strictEqual(calls.size, 3);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('logout'));
    assert.isTrue(calls.listeners.has('signup'));
  });

  it('Shows loading spinner when update is downloading', async () => {
    mockApi();

    const wrapper = mount(App);

    updateState.isDownloading = true;
    await nextTick();

    assert.isTrue(wrapper.getComponent(Loading).isVisible());
  });

  it('Handles note menu toggling', async () => {
    mockApi();
    const wrapper = mount(App);
    const wrapperVm = wrapper.vm as unknown as {
      showNoteMenu: boolean;
    };
    const toggleButton = wrapper.getComponent(NoteMenuToggle);

    assert.strictEqual(wrapperVm.showNoteMenu, true);

    await toggleButton.trigger('click');

    assert.strictEqual(wrapperVm.showNoteMenu, false);

    await toggleButton.trigger('click');

    assert.strictEqual(wrapperVm.showNoteMenu, true);
  });
});
