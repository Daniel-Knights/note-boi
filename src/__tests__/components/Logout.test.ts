import { mount } from '@vue/test-utils';

import { mockTauriApi } from '../tauri';
import { awaitSyncLoad, setCrypto } from '../utils';
import * as s from '../../store/sync';
import localNotes from '../notes.json';

import Logout from '../../components/Logout.vue';

beforeAll(setCrypto);

describe('Logout', () => {
  it('Mounts', () => {
    const wrapper = mount(Logout);
    assert.isFalse(wrapper.isVisible());
  });

  it('Logs out on click', async () => {
    mockTauriApi(localNotes);
    const wrapper = mount(Logout);
    assert.isFalse(wrapper.isVisible());

    s.state.username = 'd';
    s.state.password = '1';
    await s.login();

    assert.isTrue(wrapper.isVisible());

    await wrapper.trigger('click');
    await awaitSyncLoad();

    assert.isEmpty(s.state.token);
  });
});
