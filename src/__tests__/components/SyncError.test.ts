import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import SyncError from '../../components/SyncError.vue';

describe('SyncError', () => {
  it('Mounts', () => {
    const wrapper = mount(SyncError);

    expect(wrapper).toBeDefined();
  });
});
