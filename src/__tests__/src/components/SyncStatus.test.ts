import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as s from '../../../store/sync';
import { AppError, Encryptor, ERROR_CODE, KeyStore } from '../../../classes';
import { openedPopup, POPUP_TYPE } from '../../../store/popup';
import { tauriInvoke } from '../../../utils';
import { mockApi } from '../../api';
import {
  assertAppError,
  findByTestId,
  getAppDiv,
  getByTestId,
  getTeleportMountOptions,
  waitUntil,
} from '../../utils';

import PopupSyncAuth from '../../../components/PopupSyncAuth.vue';
import PopupSyncError from '../../../components/PopupSyncError.vue';
import SyncStatus from '../../../components/SyncStatus.vue';

describe('SyncStatus', () => {
  it('Mounts when logged out', () => {
    const { calls } = mockApi();
    const wrapper = mount(SyncStatus);

    assert.isTrue(wrapper.isVisible());
    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isTrue(getByTestId(wrapper, 'sync-button').isVisible());
    assert.strictEqual(calls.size, 3);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('logout'));
    assert.isTrue(calls.listeners.has('signup'));
  });

  it('Mounts when logged in', () => {
    const { calls } = mockApi();
    s.syncState.username = 'd';
    s.syncState.isLoggedIn = true;

    const wrapper = mount(SyncStatus);

    assert.isTrue(wrapper.isVisible());
    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(findByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
    assert.strictEqual(calls.size, 3);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('logout'));
    assert.isTrue(calls.listeners.has('signup'));
  });

  it('Displays loading spinner', async () => {
    mockApi();

    const wrapper = mount(SyncStatus);
    // Simulate having previously been logged in
    const passwordKey = await Encryptor.generatePasswordKey('1');

    s.syncState.username = 'd';

    await KeyStore.storeKey(passwordKey);
    await tauriInvoke('set_access_token', {
      username: 'd',
      accessToken: 'test-token',
    });

    s.sync();

    await nextTick();

    assert.isTrue(wrapper.isVisible());
    assert.isTrue(getByTestId(wrapper, 'loading').isVisible());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());

    await waitUntil(() => !s.syncState.loadingCount);

    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(getByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
  });

  it('Displays error icon and opens popup on click', async () => {
    mockApi();
    s.syncState.appError = new AppError({
      code: ERROR_CODE.SYNC,
      display: { sync: true },
      retry: {
        fn: () => {
          //
        },
      },
    });

    const appDiv = getAppDiv();

    document.body.appendChild(appDiv);

    const teleportMountOptions = getTeleportMountOptions(appDiv);
    const wrapper = mount(SyncStatus, teleportMountOptions);

    assert.isTrue(wrapper.isVisible());

    const errorButton = getByTestId(wrapper, 'error');
    await errorButton.trigger('click');

    assert.strictEqual(openedPopup.value, POPUP_TYPE.ERROR);
    assert.isTrue(findByTestId(wrapper, 'error-message').exists());
    assert.isTrue(findByTestId(wrapper, 'try-again').exists());
  });

  describe('Handles popups', () => {
    it('PopupSyncError', async () => {
      const { setErrorValue } = mockApi();
      const appDiv = getAppDiv();

      document.body.appendChild(appDiv);

      const teleportMountOptions = getTeleportMountOptions(appDiv);
      const wrapper = mount(SyncStatus, teleportMountOptions);

      assert.isFalse(findByTestId(wrapper, 'popup-error').exists());

      s.syncState.username = 'd';
      s.syncState.password = '1';

      setErrorValue.request({ endpoint: '/auth/login' });

      await s.login();
      await nextTick();
      await findByTestId(wrapper, 'error').trigger('click');

      assert.isTrue(findByTestId(wrapper, 'popup-error').isVisible());
      assert.strictEqual(openedPopup.value, POPUP_TYPE.ERROR);

      const resetErrorSpy = vi.spyOn(s, 'resetAppError');

      wrapper.getComponent(PopupSyncError).vm.$emit('close');
      await nextTick();

      expect(resetErrorSpy).not.toHaveBeenCalled();

      assertAppError({
        code: ERROR_CODE.LOGIN,
        message: 'Server error',
        retry: { fn: s.login },
        display: { form: true, sync: true },
      });

      assert.isFalse(findByTestId(wrapper, 'popup-error').exists());
      assert.isUndefined(openedPopup.value);
    });

    it('PopupSyncAuth', async () => {
      mockApi();

      const appDiv = getAppDiv();

      document.body.appendChild(appDiv);

      const teleportMountOptions = getTeleportMountOptions(appDiv);
      const wrapper = mount(SyncStatus, teleportMountOptions);
      const wrapperVm = wrapper.vm as unknown as { handlePopupAuthEvent: () => void };

      assert.isTrue(wrapper.isVisible());
      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());

      wrapperVm.handlePopupAuthEvent();
      await nextTick();

      assert.isTrue(findByTestId(wrapper, 'popup-auth').isVisible());

      wrapper.getComponent(PopupSyncAuth).vm.$emit('close');
      await nextTick();

      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());
      assert.isUndefined(openedPopup.value);

      s.syncState.isLoggedIn = true;
      wrapperVm.handlePopupAuthEvent();
      await nextTick();

      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());
      assert.isUndefined(openedPopup.value);
    });
  });
});
