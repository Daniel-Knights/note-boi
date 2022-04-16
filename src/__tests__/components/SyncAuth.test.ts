import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import SyncAuth from '../../components/SyncAuth.vue';

describe('SyncAuth', () => {
  it('Mounts', () => {
    const wrapper = mount(SyncAuth);

    expect(wrapper).toBeDefined();
  });
});
