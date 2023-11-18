import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as s from '../../../store/sync';
import { openedPopup, PopupType } from '../../../store/popup';
import { clearMockApiResults, mockApi, mockDb } from '../../api';
import { awaitSyncLoad, findByTestId, getByTestId } from '../../utils';

import PopupSyncAuth from '../../../components/PopupSyncAuth.vue';
import PopupSyncError from '../../../components/PopupSyncError.vue';
import SyncStatus from '../../../components/SyncStatus.vue';

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

describe('SyncStatus', () => {
  it('Mounts when logged out', async () => {
    const { calls, events, promises } = mockApi();
    const wrapper = mount(SyncStatus);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 1);
    assert.isTrue(events.emits.includes('logout'));
    assert.strictEqual(events.listeners.length, 4);
    assert.isTrue(events.listeners.includes('push-notes'));
    assert.isTrue(events.listeners.includes('login'));
    assert.isTrue(events.listeners.includes('logout'));
    assert.isTrue(events.listeners.includes('signup'));

    await awaitSyncLoad();

    const loadingWrapper = findByTestId(wrapper, 'loading');
    const errorButton = findByTestId(wrapper, 'error');
    const successWrapper = findByTestId(wrapper, 'success');
    const syncButton = getByTestId(wrapper, 'sync-button');

    assert.isFalse(loadingWrapper.exists());
    assert.isFalse(errorButton.exists());
    assert.isFalse(successWrapper.exists());
    assert.isTrue(syncButton.isVisible());
  });

  it('Mounts when logged in', async () => {
    const { calls, events, promises } = mockApi();
    const pullSpy = vi.spyOn(s, 'pull');
    s.syncState.username = 'd';
    s.syncState.token = 'token';

    const wrapper = mount(SyncStatus);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(events.emits.length, 1);
    assert.isTrue(events.emits.includes('login'));
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
    assert.strictEqual(calls.length, 3);
    assert.isTrue(calls.has('/notes/pull'));
    assert.isTrue(calls.has('new_note'));
    assert.isTrue(calls.has('sync_local_notes'));
  });

  it('Pushes on click', async () => {
    const { calls, promises } = mockApi({
      request: {
        resValue: {
          '/notes/pull': [{ notes: mockDb.encryptedNotes }],
        },
      },
    });
    const pushSpy = vi.spyOn(s, 'push');

    const wrapper = mountWithPopup();

    assert.isTrue(wrapper.isVisible());

    await awaitSyncLoad();

    const syncButton = getByTestId(wrapper, 'sync-button');
    await syncButton.trigger('click');

    assert.strictEqual(openedPopup.value, PopupType.Auth);

    clearMockApiResults({ calls, promises });

    s.syncState.username = 'd';
    s.syncState.token = 'token';

    await syncButton.trigger('click');

    expect(pushSpy).toHaveBeenCalledOnce();

    assert.strictEqual(calls.length, 0);
    assert.isTrue(getByTestId(wrapper, 'loading').isVisible());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());

    await awaitSyncLoad();
    await Promise.all(promises);

    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('/notes/push'));
    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(getByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
  });

  it.each(['Logout', 'Pull', 'Push'] as const)(
    '%s - Displays error icon and opens popup on click',
    async (errorType) => {
      mockApi();
      s.syncState.error.type = s.ErrorType[errorType];

      const wrapper = mountWithPopup();

      assert.isTrue(wrapper.isVisible());

      const errorButton = getByTestId(wrapper, 'error');
      await errorButton.trigger('click');

      assert.strictEqual(openedPopup.value, PopupType.Error);
      assert.isTrue(findByTestId(wrapper, 'error-message').exists());
      assert.isTrue(findByTestId(wrapper, 'try-again').exists());
    }
  );

  describe('Handles popups', () => {
    it('PopupSyncError', async () => {
      mockApi();

      const wrapper = mountWithPopup();

      assert.isFalse(findByTestId(wrapper, 'popup-error').exists());

      s.syncState.error.type = s.ErrorType.Logout;
      s.syncState.error.message = 'Error';

      await nextTick();

      await findByTestId(wrapper, 'error').trigger('click');

      assert.isTrue(findByTestId(wrapper, 'popup-error').isVisible());
      assert.strictEqual(openedPopup.value, PopupType.Error);

      const resetErrorSpy = vi.spyOn(s, 'resetError');

      await wrapper.getComponent(PopupSyncError).vm.$emit('close');

      expect(resetErrorSpy).not.toHaveBeenCalled();
      assert.isFalse(findByTestId(wrapper, 'popup-error').exists());
      assert.isUndefined(openedPopup.value);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.Logout);
      assert.isNotEmpty(s.syncState.error.message);
    });

    it('PopupSyncAuth', async () => {
      mockApi();

      const wrapper = mountWithPopup();
      const wrapperVm = wrapper.vm as unknown as { handlePopupAuthEvent: () => void };

      assert.isTrue(wrapper.isVisible());
      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());

      wrapperVm.handlePopupAuthEvent();
      await nextTick();

      assert.isTrue(findByTestId(wrapper, 'popup-auth').isVisible());

      const resetErrorSpy = vi.spyOn(s, 'resetError');

      await wrapper.getComponent(PopupSyncAuth).vm.$emit('close');

      // Registers emitted close from both Popup and PopupSyncAuth here
      // This isn't the case when using the actual app
      expect(resetErrorSpy).toHaveBeenCalledTimes(2);
      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());
      assert.isUndefined(openedPopup.value);

      s.syncState.token = 'token';
      wrapperVm.handlePopupAuthEvent();
      await nextTick();

      assert.isFalse(findByTestId(wrapper, 'popup-auth').exists());
      assert.isUndefined(openedPopup.value);
    });
  });
});
