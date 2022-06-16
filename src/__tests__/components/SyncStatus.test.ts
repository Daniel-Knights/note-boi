import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as s from '../../store/sync';
import { openedPopup, PopupType } from '../../store/popup';
import { mockTauriApi, testTauriListen } from '../tauri';
import { awaitSyncLoad, findByTestId, getByTestId } from '../utils';

import PopupSyncAuth from '../../components/PopupSyncAuth.vue';
import PopupSyncError from '../../components/PopupSyncError.vue';
import SyncStatus from '../../components/SyncStatus.vue';

describe('SyncStatus', () => {
  const mockEmits = {
    login: vi.fn(),
    logout: vi.fn(),
  };

  mockTauriApi([], { mockFns: mockEmits });

  function mountWithPopup() {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    return mount(SyncStatus, {
      attachTo: appDiv,
      global: {
        stubs: { teleport: true },
      },
    });
  }

  it('Mounts', () => {
    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());
    expect(mockEmits.logout).toHaveBeenCalledOnce();

    const loadingWrapper = findByTestId(wrapper, 'loading');
    const errorButton = findByTestId(wrapper, 'error');
    const successWrapper = findByTestId(wrapper, 'success');
    const syncButton = getByTestId(wrapper, 'sync-button');

    assert.isFalse(loadingWrapper.exists());
    assert.isFalse(errorButton.exists());
    assert.isFalse(successWrapper.exists());
    assert.isTrue(syncButton.isVisible());
  });

  it('Pulls on load', async () => {
    const pullSpy = vi.spyOn(s, 'pull');
    s.state.token = 'token';

    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());
    expect(mockEmits.login).toHaveBeenCalledOnce();
    expect(pullSpy).toHaveBeenCalledOnce();

    assert.isTrue(getByTestId(wrapper, 'loading').isVisible());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());

    await awaitSyncLoad();

    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(getByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
  });

  it('Pushes on click', async () => {
    const pushSpy = vi.spyOn(s, 'push');

    const wrapper = mountWithPopup();
    assert.isTrue(wrapper.isVisible());

    const syncButton = getByTestId(wrapper, 'sync-button');
    await syncButton.trigger('click');

    assert.strictEqual(openedPopup.value, PopupType.Auth);

    s.state.token = 'token';
    await syncButton.trigger('click');

    expect(pushSpy).toHaveBeenCalledOnce();

    assert.isTrue(getByTestId(wrapper, 'loading').isVisible());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());

    await awaitSyncLoad();

    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(getByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
  });

  it.each(['Logout', 'Pull', 'Push'] as const)(
    '%s - Displays error icon and opens popup on click',
    async (errorType) => {
      s.state.error.type = s.ErrorType[errorType];

      const wrapper = mountWithPopup();
      assert.isTrue(wrapper.isVisible());

      const errorButton = getByTestId(wrapper, 'error');
      await errorButton.trigger('click');

      assert.isTrue(findByTestId(wrapper, 'error-message').exists());
      assert.isTrue(findByTestId(wrapper, 'try-again').exists());
    }
  );

  it('Listens to Tauri events', () => {
    const listenResults = testTauriListen(['push-notes', 'login', 'logout', 'signup']);

    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());

    Object.entries(listenResults).forEach(([event, result]) => {
      if (!result) {
        assert.fail(`Listener for '${event}' not called`);
      }
    });
  });

  describe('Handles popups', () => {
    it('PopupSyncError', async () => {
      const wrapper = mountWithPopup();
      assert.isTrue(wrapper.isVisible());
      assert.isFalse(findByTestId(wrapper, 'popup-error').exists());

      s.state.error.type = s.ErrorType.Logout;
      await nextTick();

      await findByTestId(wrapper, 'error').trigger('click');

      assert.isTrue(findByTestId(wrapper, 'popup-error').isVisible());
      assert.strictEqual(openedPopup.value, PopupType.Error);

      await wrapper.getComponent(PopupSyncError).vm.$emit('close');

      assert.isFalse(findByTestId(wrapper, 'popup-error').exists());
      assert.isUndefined(openedPopup.value);
      assert.strictEqual(s.state.error.type, s.ErrorType.None);
      assert.isEmpty(s.state.error.message);
    });

    it('PopupSyncAuth', async () => {
      const wrapper = mountWithPopup();
      assert.isTrue(wrapper.isVisible());
      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());

      wrapper.vm.handlePopupAuthEvent();
      await nextTick();

      assert.isTrue(findByTestId(wrapper, 'popup-auth').isVisible());

      await wrapper.getComponent(PopupSyncAuth).vm.$emit('close');

      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());
      assert.isUndefined(openedPopup.value);

      s.state.token = 'token';
      wrapper.vm.handlePopupAuthEvent();
      await nextTick();

      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());
      assert.isUndefined(openedPopup.value);
    });
  });
});
