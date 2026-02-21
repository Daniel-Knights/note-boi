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

  it('Does not emit close on click inside menu', () => {
    const wrapper = mountDropMenu({
      items: [{ label: 'Test', testId: 'test' }],
    });

    wrapper.element.click();

    assert.isUndefined(wrapper.emitted('close'));
  });

  it('Emits close on menu item click if closeOnClick is true', async () => {
    const wrapper = mountDropMenu({
      items: [{ label: 'Test', testId: 'test' }],
      closeOnClick: true,
    });

    await getByTestId(wrapper, 'test').trigger('click');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Does not emit close on menu item click if closeOnClick is false', async () => {
    const wrapper = mountDropMenu({
      items: [{ label: 'Test', testId: 'test' }],
      closeOnClick: false,
    });

    await getByTestId(wrapper, 'test').trigger('click');

    assert.isUndefined(wrapper.emitted('close'));
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

  it('Filters items based on showIf condition', () => {
    const items = [
      { label: 'visible-1', testId: 'visible-1', showIf: () => true },
      { label: 'hidden-1', testId: 'hidden-1', showIf: () => false },
      { label: 'visible-2', testId: 'visible-2' }, // No showIf, should be visible
      { label: 'hidden-2', testId: 'hidden-2', showIf: () => false },
      { label: 'visible-3', testId: 'visible-3', showIf: () => true },
    ];
    const wrapper = mountDropMenu({ items });

    assert.isTrue(findByTestId(wrapper, 'visible-1').exists());
    assert.isFalse(findByTestId(wrapper, 'hidden-1').exists());
    assert.isTrue(findByTestId(wrapper, 'visible-2').exists());
    assert.isFalse(findByTestId(wrapper, 'hidden-2').exists());
    assert.isTrue(findByTestId(wrapper, 'visible-3').exists());
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

  it('Cleans up event listener on unmount', () => {
    const wrapper = mountDropMenu();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    document.body.click();
    const emittedCount = wrapper.emitted('close')!.length;
    assert.strictEqual(emittedCount, 1);

    wrapper.unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
  });
});
