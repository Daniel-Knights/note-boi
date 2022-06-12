import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as s from '../../store/sync';
import { mockTauriApi } from '../tauri';
import { getByTestId, setCrypto } from '../utils';

import Popup from '../../components/Popup.vue';
import PopupSyncError from '../../components/PopupSyncError.vue';

function mountPopupSyncError() {
  return mount(PopupSyncError, {
    global: {
      stubs: { teleport: true },
    },
  });
}

beforeAll(setCrypto);
enableAutoUnmount(afterEach);

describe('PopupSyncError', () => {
  const errorMessage = 'I am a sync error';
  s.state.error.message = errorMessage;

  mockTauriApi([]);

  it('Mounts', () => {
    const wrapper = mountPopupSyncError();
    assert.isTrue(wrapper.isVisible());

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), `Error: ${errorMessage}`);
  });

  it('Emits close', async () => {
    const wrapper = mountPopupSyncError();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  it('Retries push', async () => {
    const pushSpy = vi.spyOn(s, 'push');
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncError();
    assert.isTrue(wrapper.isVisible());

    s.state.error.type = s.ErrorType.Push;

    const tryAgainButton = getByTestId(wrapper, 'try-again');
    await tryAgainButton.trigger('click');

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(resetErrorSpy).toHaveBeenCalledOnce();
    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  it('Retries pull', async () => {
    const pullSpy = vi.spyOn(s, 'pull');
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncError();
    assert.isTrue(wrapper.isVisible());

    s.state.error.type = s.ErrorType.Pull;

    const tryAgainButton = getByTestId(wrapper, 'try-again');
    await tryAgainButton.trigger('click');

    expect(pullSpy).toHaveBeenCalledOnce();
    expect(resetErrorSpy).toHaveBeenCalledOnce();
    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  it('Retries logout', async () => {
    const logoutSpy = vi.spyOn(s, 'logout');
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncError();
    assert.isTrue(wrapper.isVisible());

    s.state.error.type = s.ErrorType.Logout;

    const tryAgainButton = getByTestId(wrapper, 'try-again');
    await tryAgainButton.trigger('click');

    expect(logoutSpy).toHaveBeenCalledOnce();
    expect(resetErrorSpy).toHaveBeenCalledOnce();
    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });
});
