import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as s from '../../store/sync';

import Logout from '../../components/Logout.vue';
import Settings from '../../components/Settings.vue';
import UtilityMenu from '../../components/UtilityMenu.vue';

enableAutoUnmount(afterEach);

describe('UtilityMenu', () => {
  it('Mounts with correct components', () => {
    s.state.token = 'token';
    const wrapper = mount(UtilityMenu);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.findComponent(Logout).exists());
    assert.isTrue(wrapper.findComponent(Settings).exists());
    assert.strictEqual(wrapper.element.childElementCount, 2);
  });
});