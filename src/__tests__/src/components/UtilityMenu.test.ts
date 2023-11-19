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
    assert.lengthOf(calls, 0);
    assert.lengthOf(events.emits, 0);
    assert.lengthOf(events.listeners, 0);
  });
});
