import { enableAutoUnmount, mount } from '@vue/test-utils';

import Popup from '../../components/Popup.vue';

enableAutoUnmount(afterEach);

describe('Popup', () => {
  const appDiv = document.createElement('div');
  appDiv.id = 'app';
  document.body.appendChild(appDiv);

  vi.useFakeTimers();

  const slot = '<div>Hello World</div>';
  const wrapper = mount(Popup, {
    attachTo: appDiv,
    slots: { default: slot },
    global: {
      stubs: { teleport: true },
    },
  });

  vi.runAllTimers();

  it('Mounts', () => {
    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.html().includes(slot));
  });

  document.removeEventListener = vi.fn(() => null);

  it('Closes on escape key', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(document.removeEventListener).toHaveBeenCalled();
  });

  vi.resetAllMocks();

  it('Closes on click outside', () => {
    document.body.dispatchEvent(new MouseEvent('mousedown'));

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(document.removeEventListener).toHaveBeenCalled();
  });

  vi.resetAllMocks();

  it('Unmounts', () => {
    wrapper.unmount();

    expect(document.removeEventListener).toHaveBeenCalled();
  });
});
