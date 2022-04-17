import { describe, it, assert } from 'vitest';
import { mount } from '@vue/test-utils';

import ContextMenu from '../../components/ContextMenu.vue';

describe('ContextMenu', () => {
  it('Mounts without passed ev', () => {
    const wrapper = mount(ContextMenu);

    assert.isDefined(wrapper);
    assert.isFalse(wrapper.isVisible());
  });

  it('Mounts with ev', async () => {
    const ev: MouseEvent = new MouseEvent('contextmenu', {
      clientX: 100,
      clientY: 200,
    });

    const wrapper = mount(ContextMenu);
    await wrapper.setProps({ ev: ev || undefined });

    const elementStyles = (wrapper.element as HTMLUListElement).style;

    assert.isDefined(wrapper);
    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(elementStyles.top, `${ev.clientY}px`);
    assert.strictEqual(elementStyles.left, `${ev.clientX}px`);
  });
});
