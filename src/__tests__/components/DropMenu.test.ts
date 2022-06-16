import { enableAutoUnmount, mount } from '@vue/test-utils';

import { DropMenuItemData } from '../../components/types';
import { findByTestId, getByTestId } from '../utils';

import DropMenu from '../../components/DropMenu.vue';

enableAutoUnmount(afterEach);

function mountDropMenu(items: DropMenuItemData[] = []) {
  return mount(DropMenu, {
    props: { items },
  });
}

describe('DropMenu', () => {
  it('Mounts', () => {
    const wrapper = mountDropMenu();
    assert.isTrue(wrapper.isVisible());
  });

  it('Emits close on click', () => {
    const wrapper = mountDropMenu();
    assert.isTrue(wrapper.isVisible());

    document.body.click();

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  describe('DropMenuItem', () => {
    const itemClass = 'drop-menu__item';

    it('Renders each item', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        label: `label-${i}`,
        testId: `item-${i}`,
      }));
      const wrapper = mountDropMenu(items);
      assert.isTrue(wrapper.isVisible());

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
      assert.isTrue(wrapper.isVisible());

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
        subMenu: [],
      }));
      const wrapper = mountDropMenu(items);
      assert.isTrue(wrapper.isVisible());

      items.forEach(({ testId }) => {
        const itemWrapper = getByTestId(wrapper, testId);

        assert.isTrue(itemWrapper.isVisible());
        assert.isTrue(itemWrapper.classes(`${itemClass}--disabled`));
        assert.isTrue(itemWrapper.classes(`${itemClass}--selected`));
        assert.isTrue(itemWrapper.classes(`${itemClass}--has-sub-menu`));
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
      assert.isTrue(wrapper.isVisible());

      items.forEach(({ testId }) => {
        const itemWrapper = getByTestId(wrapper, testId);

        assert.isTrue(itemWrapper.isVisible());
        assert.isTrue(itemWrapper.classes(`${itemClass}--has-sub-menu`));
        assert.isTrue(findByTestId(itemWrapper, 'sub-item-1').exists());
        assert.isTrue(findByTestId(itemWrapper, 'sub-item-2').exists());
        assert.isTrue(findByTestId(itemWrapper, 'sub-item-3').exists());
      });
    });
  });
});
