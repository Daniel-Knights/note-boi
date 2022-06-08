import { enableAutoUnmount, mount } from '@vue/test-utils';

import { DropMenuItemData } from '../../components/types';
import { getByTestId } from '../utils';

import DropMenu from '../../components/DropMenu.vue';

enableAutoUnmount(afterEach);

function mountDropMenu(items: DropMenuItemData[] = []) {
  return mount(DropMenu, {
    propsData: { items },
  });
}

describe('DropMenu', () => {
  it('Mounts', () => {
    const wrapper = mountDropMenu();
    assert.isTrue(wrapper.isVisible());
  });

  it('Renders each item', () => {
    const items = Array.from({ length: 5 }, (i) => ({ label: '', testId: `item-${i}` }));
    const wrapper = mountDropMenu(items);
    assert.isTrue(wrapper.isVisible());

    items.forEach(({ testId }) => {
      assert.isTrue(getByTestId(wrapper, testId).isVisible());
    });
  });

  it('Emits close on click', () => {
    const wrapper = mountDropMenu();
    assert.isTrue(wrapper.isVisible());

    document.body.click();

    const emittedClose = wrapper.emitted('close');

    assert.isDefined(emittedClose);
    assert.isAbove(emittedClose?.length || 0, 0);
  });
});
