import { mount } from '@vue/test-utils';
import { DefineComponent } from 'vue';

import * as s from '../../store/sync';
import localNotes from '../notes.json';
import { mockTauriApi } from '../tauri';
import { awaitSyncLoad, copyObjArr } from '../utils';

import Logout from '../../components/Logout.vue';

describe('Logout', () => {
  it('Mounts', () => {
    const wrapper = mount(Logout as DefineComponent);
    assert.isFalse(wrapper.isVisible());
  });

  it('Logs out on click', async () => {
    mockTauriApi(copyObjArr(localNotes));
    const wrapper = mount(Logout as DefineComponent);
    assert.isFalse(wrapper.isVisible());

    s.syncState.username = 'd';
    s.syncState.password = '1';
    await s.login();

    assert.isTrue(wrapper.isVisible());

    await wrapper.trigger('click');
    await awaitSyncLoad();

    assert.isEmpty(s.syncState.token);
  });
});
