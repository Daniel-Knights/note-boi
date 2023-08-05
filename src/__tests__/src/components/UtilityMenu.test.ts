import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { mockApi } from '../../api';

import Logout from '../../../components/Logout.vue';
import Settings from '../../../components/Settings.vue';
import UtilityMenu from '../../../components/UtilityMenu.vue';

describe('UtilityMenu', () => {
  it('Mounts with correct components', async () => {
    const { calls, events, promises } = mockApi();
    s.syncState.token = 'token';
    const wrapper = mount(UtilityMenu);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.findComponent(Logout).exists());
    assert.isTrue(wrapper.findComponent(Settings).exists());
    assert.strictEqual(wrapper.element.childElementCount, 2);
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });
});
