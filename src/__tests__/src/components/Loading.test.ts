import { mount } from '@vue/test-utils';

import { mockApi } from '../../mock';

import Loading from '../../../components/Loading.vue';

describe('Loading', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(Loading);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Is announced as a status', () => {
    const wrapper = mount(Loading);

    assert.strictEqual(wrapper.attributes('role'), 'status');
    assert.strictEqual(wrapper.attributes('aria-label'), 'Loading');
  });
});
