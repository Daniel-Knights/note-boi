import { mount } from '@vue/test-utils';
import { DefineComponent } from 'vue';

import Loading from '../../components/Loading.vue';

describe('Loading', () => {
  it('Mounts', () => {
    const wrapper = mount(Loading as DefineComponent);
    assert.isTrue(wrapper.isVisible());
  });
});
