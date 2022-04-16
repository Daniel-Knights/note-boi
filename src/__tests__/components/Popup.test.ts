import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import Popup from '../../components/Popup.vue';

describe('Popup', () => {
  it('Mounts', () => {
    const wrapper = mount(Popup);

    expect(wrapper).toBeDefined();
  });
});
