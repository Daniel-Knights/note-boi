import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { AppError, ERROR_CODE } from '../../../appError';
import { mockApi } from '../../api';
import { findByTestId, getByTestId, waitUntil } from '../../utils';

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
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupSyncError();
    const errorMessage = 'I am a sync error';

    s.syncState.appError = new AppError({
      code: ERROR_CODE.PULL,
      message: errorMessage,
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), `Error: ${errorMessage}`);
  });

  it('Emits close', () => {
    const wrapper = mountPopupSyncError();
    wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Retries', async () => {
    mockApi();

    const retryMock = vi.fn();
    const resetErrorSpy = vi.spyOn(s, 'resetAppError');

    s.syncState.appError = new AppError({
      code: ERROR_CODE.PULL,
      retry: { fn: retryMock },
    });

    const wrapper = mountPopupSyncError();
    const tryAgainButton = getByTestId(wrapper, 'try-again');

    await tryAgainButton.trigger('click');
    await waitUntil(() => !s.syncState.isLoading);

    expect(resetErrorSpy).toHaveBeenCalledOnce();
    expect(retryMock).toHaveBeenCalledOnce();

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('No try again button when no retry function', () => {
    mockApi();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.PULL,
    });

    const wrapper = mountPopupSyncError();

    assert.isFalse(findByTestId(wrapper, 'try-again').exists());
  });

  it('Shows default error message when none provided', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupSyncError();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.PULL,
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), 'Error: Something went wrong');
  });
});
