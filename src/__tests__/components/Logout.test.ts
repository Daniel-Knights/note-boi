import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import Logout from '../../components/Logout.vue';
import { mockTauriApi } from '../tauri';
import { setCrypto } from '../utils';
import * as syncStore from '../../store/sync';
import localNotes from '../notes.json';

beforeAll(setCrypto);

describe('Logout', () => {
  it('Mounts', () => {
    const wrapper = mount(Logout);

    assert.isDefined(wrapper);
    assert.isFalse(wrapper.isVisible());
  });

  it('Logs out on click', async () => {
    mockTauriApi(localNotes);
    const wrapper = mount(Logout);

    assert.isDefined(wrapper);
    assert.isFalse(wrapper.isVisible());

    syncStore.state.username = 'd';
    syncStore.state.password = '1';
    await syncStore.login();

    assert.isTrue(wrapper.isVisible());

    await wrapper.trigger('click');

    // Workaround for awaiting logout call
    function awaitLogout(): Promise<void> | void {
      if (syncStore.state.isLoading) {
        return nextTick().then(awaitLogout);
      }
    }

    await awaitLogout();

    assert.isEmpty(syncStore.state.token);
  });
});
