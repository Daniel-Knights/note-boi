import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import ContextMenu from '../../components/ContextMenu.vue';

describe('ContextMenu', () => {
  it('Mounts', () => {
    const wrapper = mount(ContextMenu);

    expect(wrapper).toBeDefined();
  });
});
