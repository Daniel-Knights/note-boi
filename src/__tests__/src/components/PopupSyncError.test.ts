import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { mockApi } from '../../api';
import { getByTestId } from '../../utils';

import Popup from '../../../components/Popup.vue';
import PopupSyncError from '../../../components/PopupSyncError.vue';

function mountPopupSyncError() {
  return mount(PopupSyncError, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('PopupSyncError', () => {
  const errorMessage = 'I am a sync error';
  s.syncState.error.message = errorMessage;

  it('Mounts', async () => {
    const { calls, events, promises } = mockApi();
    const wrapper = mountPopupSyncError();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.lengthOf(calls, 0);
    assert.lengthOf(events.emits, 0);
    assert.lengthOf(events.listeners, 0);

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), `Error: ${errorMessage}`);
  });

  it('Emits close', async () => {
    const wrapper = mountPopupSyncError();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Retries push', async () => {
    const pushSpy = vi.spyOn(s, 'push');
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncError();

    s.syncState.error.type = s.ErrorType.Push;

    const tryAgainButton = getByTestId(wrapper, 'try-again');
    await tryAgainButton.trigger('click');

    expect(pushSpy).toHaveBeenCalledOnce();
    expect(resetErrorSpy).toHaveBeenCalledOnce();
    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Retries pull', async () => {
    const pullSpy = vi.spyOn(s, 'pull');
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncError();

    s.syncState.error.type = s.ErrorType.Pull;

    const tryAgainButton = getByTestId(wrapper, 'try-again');
    await tryAgainButton.trigger('click');

    expect(pullSpy).toHaveBeenCalledOnce();
    expect(resetErrorSpy).toHaveBeenCalledOnce();
    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Retries logout', async () => {
    mockApi();

    const logoutSpy = vi.spyOn(s, 'logout');
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncError();

    s.syncState.error.type = s.ErrorType.Logout;

    const tryAgainButton = getByTestId(wrapper, 'try-again');
    await tryAgainButton.trigger('click');

    expect(logoutSpy).toHaveBeenCalledOnce();
    expect(resetErrorSpy).toHaveBeenCalledOnce();
    assert.lengthOf(wrapper.emitted('close')!, 1);
  });
});
