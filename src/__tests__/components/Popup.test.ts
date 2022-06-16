import { mount } from '@vue/test-utils';

import Popup from '../../components/Popup.vue';

const slot = '<div>Hello World</div>';
const eventSpies = {
  document: {
    add: vi.spyOn(document, 'addEventListener'),
    remove: vi.spyOn(document, 'removeEventListener'),
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

  vi.useFakeTimers();

  const wrapper = mount(Popup, {
    attachTo: appDiv,
    slots: { default: slot },
    global: {
      stubs: { teleport: true },
    },
  });

  vi.runAllTimers();

  return wrapper;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Popup', () => {
  it('Mounts', () => {
    const wrapper = mountPopup();

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(wrapper.html().includes(slot));
    expect(eventSpies.document.add).toHaveBeenCalledOnce();
    expect(eventSpies.body.add).toHaveBeenCalledOnce();
  });

  it('Closes on escape key', () => {
    const wrapper = mountPopup();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(eventSpies.document.remove).toHaveBeenCalledOnce();
    expect(eventSpies.body.remove).toHaveBeenCalledOnce();
  });

  it('Closes on click outside', () => {
    const wrapper = mountPopup();

    document.body.dispatchEvent(new MouseEvent('mousedown'));

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(eventSpies.document.remove).toHaveBeenCalledOnce();
    expect(eventSpies.body.remove).toHaveBeenCalledOnce();
  });

  it('Unmounts', () => {
    const wrapper = mountPopup();

    wrapper.unmount();

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
    expect(eventSpies.document.remove).toHaveBeenCalledOnce();
    expect(eventSpies.body.remove).toHaveBeenCalledOnce();
  });
});
