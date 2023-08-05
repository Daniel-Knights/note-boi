import { mount } from '@vue/test-utils';

import { mockApi } from '../../api';

import Popup from '../../../components/Popup.vue';

const slot = '<div>Hello World</div>';
const eventSpies = {
  window: {
    add: vi.spyOn(window, 'addEventListener'),
    remove: vi.spyOn(window, 'removeEventListener'),
  },
  body: {
    add: vi.spyOn(document.body, 'addEventListener'),
    remove: vi.spyOn(document.body, 'removeEventListener'),
  },
};

function mountPopup() {
  const appDiv = document.createElement('div');
  appDiv.id = 'app';
  document.body.appendChild(appDiv);

  return mount(Popup, {
    attachTo: appDiv,
    slots: { default: slot },
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
    const { calls, events, promises } = mockApi();
    const wrapper = mountPopup();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.html().includes(slot));
    expect(eventSpies.window.add).toHaveBeenCalledOnce();
    expect(eventSpies.body.add).toHaveBeenCalledOnce();
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Closes on escape key', () => {
    const wrapper = mountPopup();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(eventSpies.window.remove).toHaveBeenCalledOnce();
    expect(eventSpies.body.remove).toHaveBeenCalledOnce();
  });

  it('Closes on click outside', () => {
    const wrapper = mountPopup();

    document.body.dispatchEvent(new MouseEvent('mouseup'));

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(eventSpies.window.remove).toHaveBeenCalledOnce();
    expect(eventSpies.body.remove).toHaveBeenCalledOnce();
  });

  it('Unmounts', () => {
    const wrapper = mountPopup();

    wrapper.unmount();

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(eventSpies.window.remove).toHaveBeenCalledOnce();
    expect(eventSpies.body.remove).toHaveBeenCalledOnce();
  });
});
