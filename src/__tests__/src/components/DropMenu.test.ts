import { mount } from '@vue/test-utils';

import { DropMenuItemData } from '../../../components/types';
import { mockApi } from '../../mock';
import { findByTestId, getByTestId } from '../../utils';

import DropMenu from '../../../components/DropMenu.vue';

const ITEM_CLASS = 'drop-menu__item';

function mountDropMenu(items: DropMenuItemData[] = []) {
  return mount(DropMenu, {
    props: { items },
  });
}

describe('DropMenu', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();

    const wrapper = mountDropMenu();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Emits close on click', () => {
    const wrapper = mountDropMenu();

    document.body.click();

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Renders each item', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      label: `label-${i}`,
      testId: `item-${i}`,
    }));
    const wrapper = mountDropMenu(items);

    items.forEach(({ label, testId }) => {
      const itemWrapper = getByTestId(wrapper, testId);

      assert.isTrue(itemWrapper.isVisible());
      assert.strictEqual(itemWrapper.text(), label);
    });
  });

  it('Adds click handlers to items', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      label: '',
      testId: `item-${i}`,
      clickHandler: vi.fn(),
    }));
    const wrapper = mountDropMenu(items);

    items.forEach(({ testId, clickHandler }) => {
      const itemWrapper = getByTestId(wrapper, testId);
      assert.isTrue(itemWrapper.isVisible());

      itemWrapper.trigger('click');

      expect(clickHandler).toHaveBeenCalledOnce();
    });
  });

  it('Adds classes to items', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      label: '',
      testId: `item-${i}`,
      disabled: true,
      selected: true,
      danger: true,
      subMenu: [],
    }));
    const wrapper = mountDropMenu(items);

    items.forEach(({ testId }) => {
      const itemWrapper = getByTestId(wrapper, testId);

      assert.isTrue(itemWrapper.isVisible());
      assert.isTrue(itemWrapper.classes(`${ITEM_CLASS}--disabled`));
      assert.isTrue(itemWrapper.classes(`${ITEM_CLASS}--selected`));
      assert.isTrue(itemWrapper.classes(`${ITEM_CLASS}--danger`));
      assert.isTrue(itemWrapper.classes(`${ITEM_CLASS}--has-sub-menu`));
    });
  });

  it('Handles sub-menus', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      label: '',
      testId: `item-${i}`,
      subMenu: [
        { label: '', testId: 'sub-item-1' },
        { label: '', testId: 'sub-item-2' },
        { label: '', testId: 'sub-item-3' },
      ],
    }));
    const wrapper = mountDropMenu(items);

    items.forEach(({ testId }) => {
      const itemWrapper = getByTestId(wrapper, testId);

      assert.isTrue(itemWrapper.isVisible());
      assert.isTrue(itemWrapper.classes(`${ITEM_CLASS}--has-sub-menu`));
      assert.isTrue(findByTestId(itemWrapper, 'sub-item-1').exists());
      assert.isTrue(findByTestId(itemWrapper, 'sub-item-2').exists());
      assert.isTrue(findByTestId(itemWrapper, 'sub-item-3').exists());
    });
  });
});
