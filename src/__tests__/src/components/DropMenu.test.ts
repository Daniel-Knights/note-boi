import { mount } from '@vue/test-utils';

import { mockApi } from '../../mock';
import { findByTestId, getByTestId } from '../../utils';

import DropMenu from '../../../components/DropMenu.vue';

const ITEM_CLASS = 'drop-menu__item';

function mountDropMenu(props?: Partial<InstanceType<typeof DropMenu>['$props']>) {
  return mount(DropMenu, {
    props: {
      items: [],
      ...props,
    },
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

  it('Emits close on click outside', () => {
    const wrapper = mountDropMenu();

    document.body.click();

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Emits close on menu item click if closeOnClick is true', async () => {
    const wrapper = mountDropMenu({
      items: [{ label: 'Test', testId: 'test' }],
      closeOnClick: true,
    });

    await getByTestId(wrapper, 'test').trigger('click');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Renders each item', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      label: `label-${i}`,
      testId: `item-${i}`,
    }));
    const wrapper = mountDropMenu({ items });

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
    const wrapper = mountDropMenu({ items });

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
      selected: true,
      danger: true,
      subMenu: [],
    }));
    const wrapper = mountDropMenu({ items });

    items.forEach(({ testId }) => {
      const itemWrapper = getByTestId(wrapper, testId);

      assert.isTrue(itemWrapper.isVisible());
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
    const wrapper = mountDropMenu({ items });

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
