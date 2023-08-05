import { mount } from '@vue/test-utils';

import { mockApi } from '../../api';

import Loading from '../../../components/Loading.vue';

describe('Loading', () => {
  it('Mounts', async () => {
    const { calls, events, promises } = mockApi();
    const wrapper = mount(Loading);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });
});
