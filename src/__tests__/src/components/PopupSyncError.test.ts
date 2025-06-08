import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as s from '../../../store/sync';
import { AppError, ERROR_CODE } from '../../../classes';
import { mockApi } from '../../api';
import {
  assertAppError,
  findByTestId,
  getByTestId,
  resolveImmediate,
  waitUntil,
} from '../../utils';

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
      code: ERROR_CODE.SYNC,
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
      code: ERROR_CODE.SYNC,
      retry: { fn: retryMock },
    });

    const wrapper = mountPopupSyncError();
    const tryAgainButton = getByTestId(wrapper, 'try-again');

    await tryAgainButton.trigger('click');
    await waitUntil(() => !s.syncState.loadingCount);

    expect(resetErrorSpy).toHaveBeenCalledOnce();
    expect(retryMock).toHaveBeenCalledOnce();

    assertAppError();
    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('No try again button when no retry function', () => {
    mockApi();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.SYNC,
    });

    const wrapper = mountPopupSyncError();

    assert.isFalse(findByTestId(wrapper, 'try-again').exists());
  });

  it('Ignores', async () => {
    const { calls, promises } = mockApi();

    const wrapper = mountPopupSyncError();
    const ignoreButton = getByTestId(wrapper, 'ignore');
    const resetErrorSpy = vi.spyOn(s, 'resetAppError');
    const clientSideLogoutSpy = vi.spyOn(s, 'clientSideLogout');

    await ignoreButton.trigger('click');
    await nextTick();
    await resolveImmediate();
    await Promise.all(promises);

    expect(resetErrorSpy).toHaveBeenCalledOnce();
    expect(clientSideLogoutSpy).toHaveBeenCalledOnce();

    assertAppError();
    assert.lengthOf(wrapper.emitted('close')!, 1);
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.invoke.has('delete_access_token'));
    assert.deepEqual(calls.invoke[0]!.calledWith, { username: '' });
    assert.isTrue(calls.emits.has('auth'));
  });

  it('Shows default error message when none provided', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupSyncError();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.SYNC,
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), 'Error: Something went wrong');
  });
});
