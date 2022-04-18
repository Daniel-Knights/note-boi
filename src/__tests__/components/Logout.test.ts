import { mount } from '@vue/test-utils';

import Logout from '../../components/Logout.vue';

describe('Logout', () => {
  it('Mounts', () => {
    const wrapper = mount(Logout);

    expect(wrapper).toBeDefined();
  });
});
