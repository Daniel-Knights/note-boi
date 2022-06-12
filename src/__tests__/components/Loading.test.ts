import { mount } from '@vue/test-utils';

import Loading from '../../components/Loading.vue';

describe('Loading', () => {
  it('Mounts', () => {
    const wrapper = mount(Loading);
    assert.isTrue(wrapper.isVisible());
  });
});
