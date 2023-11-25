import { mount } from '@vue/test-utils';

import { mockApi } from '../../api';

import Popup from '../../../components/Popup.vue';

const SLOT_CONTENT = '<div>Hello World</div>';

function mountPopup() {
  const appDiv = document.createElement('div');
  appDiv.id = 'app';
  document.body.appendChild(appDiv);

  return mount(Popup, {
    attachTo: appDiv,
    slots: { default: SLOT_CONTENT },
    global: {
      stubs: { teleport: true },
    },
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Popup', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const addBodyListenerSpy = vi.spyOn(document.body, 'addEventListener');

    const wrapper = mountPopup();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.html().includes(SLOT_CONTENT));
    expect(addWindowListenerSpy).toHaveBeenCalledOnce();
    expect(addBodyListenerSpy).toHaveBeenCalledOnce();
    assert.strictEqual(calls.size, 0);
  });

  it('Closes on escape key', () => {
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');
    const removeBodyListenerSpy = vi.spyOn(document.body, 'removeEventListener');

    const wrapper = mountPopup();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    assert.lengthOf(wrapper.emitted('close')!, 1);
    expect(removeWindowListenerSpy).toHaveBeenCalledOnce();
    expect(removeBodyListenerSpy).toHaveBeenCalledOnce();
  });

  it('Closes on click outside', () => {
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');
    const removeBodyListenerSpy = vi.spyOn(document.body, 'removeEventListener');

    const wrapper = mountPopup();

    document.body.dispatchEvent(new MouseEvent('mousedown'));

    assert.lengthOf(wrapper.emitted('close')!, 1);
    expect(removeWindowListenerSpy).toHaveBeenCalledOnce();
    expect(removeBodyListenerSpy).toHaveBeenCalledOnce();
  });

  it('Unmounts', () => {
    const removeWindowListenerSpy = vi.spyOn(window, 'removeEventListener');
    const removeBodyListenerSpy = vi.spyOn(document.body, 'removeEventListener');

    const wrapper = mountPopup();

    wrapper.unmount();

    assert.lengthOf(wrapper.emitted('close')!, 1);
    expect(removeWindowListenerSpy).toHaveBeenCalledOnce();
    expect(removeBodyListenerSpy).toHaveBeenCalledOnce();
  });
});
