import { mount } from '@vue/test-utils';

import { mockApi } from '../../api';

import Loading from '../../../components/Loading.vue';

describe('Loading', () => {
  it('Mounts', async () => {
    const { calls, events, promises } = mockApi();
    const wrapper = mount(Loading);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.lengthOf(calls, 0);
    assert.lengthOf(events.emits, 0);
    assert.lengthOf(events.listeners, 0);
  });
});
