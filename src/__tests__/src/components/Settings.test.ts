import { ComponentMountingOptions, DOMWrapper, mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as a from '../../../api';
import * as s from '../../../store/sync';
import * as u from '../../../store/update';
import { Storage, TokenStore } from '../../../classes';
import { COLOUR_THEMES } from '../../../constant';
import { openedPopup, POPUP_TYPE } from '../../../store/popup';
import { selectedTheme } from '../../../store/theme';
import { clearMockApiResults, mockApi } from '../../mock';
import {
  assertRequest,
  findByTestId,
  getAppDiv,
  getByTestId,
  getTeleportMountOptions,
  waitUntil,
} from '../../utils';

import DropMenu from '../../../components/DropMenu.vue';
import PopupChangePassword from '../../../components/PopupChangePassword.vue';
import PopupInfo from '../../../components/PopupInfo.vue';
import Settings from '../../../components/Settings.vue';

async function mountSettingsAndOpen(
  options?: ComponentMountingOptions<typeof Settings>
): Promise<VueWrapper<InstanceType<typeof Settings>>> {
  const wrapper = mount(Settings, options);

  await findByTestId(wrapper, 'settings-button').trigger('click');

  return wrapper;
}

function assertMenuItemCount(
  wrapper: VueWrapper | Omit<DOMWrapper<Node>, 'exists'>,
  count: number
) {
  const dropMenuWrapper = findByTestId(wrapper, 'drop-menu');
  const dropMenuEl = dropMenuWrapper.element as HTMLElement;

  assert.strictEqual(dropMenuEl.childElementCount, count);
}

describe('Settings', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(Settings);

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Opens and closes drop menu', async () => {
    const wrapper = mount(Settings);
    const wrapperVm = wrapper.vm as unknown as { show: boolean };

    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());

    const settingsButtonWrapper = findByTestId(wrapper, 'settings-button');

    await settingsButtonWrapper.trigger('click');

    assert.isTrue(wrapperVm.show);
    assert.isTrue(findByTestId(wrapper, 'drop-menu').isVisible());
    assertMenuItemCount(wrapper, 3);

    await settingsButtonWrapper.trigger('click');

    assert.isFalse(wrapperVm.show);
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());

    await settingsButtonWrapper.trigger('click');
    assert.isTrue(wrapperVm.show);
    assert.isTrue(findByTestId(wrapper, 'drop-menu').isVisible());
    assertMenuItemCount(wrapper, 3);

    wrapper.getComponent(DropMenu).vm.$emit('close');

    assert.isFalse(wrapperVm.show);
    await nextTick();
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());
  });

  it('Sets theme preference', async () => {
    const wrapper = await mountSettingsAndOpen();

    for (const theme of COLOUR_THEMES) {
      const currentThemeWrapper = getByTestId(wrapper, theme);
      assert.isFalse(currentThemeWrapper.classes('drop-menu__item--selected'));

      // eslint-disable-next-line no-await-in-loop
      await currentThemeWrapper.trigger('click');

      assert.strictEqual(selectedTheme.value, theme);
      assert.strictEqual(Storage.get('THEME'), theme);
      assert.isTrue(currentThemeWrapper.classes('drop-menu__item--selected'));
    }
  });

  describe('Updates menu item', () => {
    it('Sets update strategy', async () => {
      const { calls, promises } = mockApi();
      const wrapper = await mountSettingsAndOpen();
      const setUpdateStrategySpy = vi.spyOn(u, 'setUpdateStrategy');
      const updateAutoWrapper = findByTestId(wrapper, 'update-auto');

      assert.strictEqual(u.updateState.strategy, 'manual');
      assert.isNull(Storage.get('UPDATE_STRATEGY'));
      assert.isFalse(updateAutoWrapper.classes('drop-menu__item--selected'));

      await updateAutoWrapper.trigger('click');
      await Promise.all(promises);

      expect(setUpdateStrategySpy).toHaveBeenCalledOnce();
      expect(setUpdateStrategySpy).toHaveBeenCalledWith('auto');
      assert.strictEqual(calls.size, 0);
      assert.strictEqual(u.updateState.strategy, 'auto');
      assert.strictEqual(Storage.get('UPDATE_STRATEGY'), 'auto');
      assert.isTrue(updateAutoWrapper.classes('drop-menu__item--selected'));

      const updateManualWrapper = findByTestId(wrapper, 'update-manual');

      vi.clearAllMocks();

      await updateManualWrapper.trigger('click');
      await Promise.all(promises);

      expect(setUpdateStrategySpy).toHaveBeenCalledOnce();
      expect(setUpdateStrategySpy).toHaveBeenCalledWith('manual');
      assert.strictEqual(calls.size, 0);
      assert.strictEqual(u.updateState.strategy, 'manual');
      assert.strictEqual(Storage.get('UPDATE_STRATEGY'), 'manual');
      assert.isTrue(updateManualWrapper.classes('drop-menu__item--selected'));
    });

    it('Update and restart menu item', async () => {
      const { calls, promises } = mockApi();
      const wrapper = await mountSettingsAndOpen();
      const updatesWrapper = getByTestId(wrapper, 'updates');
      let updateRestartWrapper = findByTestId(updatesWrapper, 'update-restart');
      assert.isFalse(updateRestartWrapper.exists());
      assertMenuItemCount(updatesWrapper, 1);

      await u.handleUpdate();
      await nextTick();

      updateRestartWrapper = findByTestId(updatesWrapper, 'update-restart');
      assert.isTrue(updateRestartWrapper.isVisible());
      assertMenuItemCount(updatesWrapper, 2);

      clearMockApiResults({ calls, promises });

      await updateRestartWrapper.trigger('click');
      await waitUntil(() => calls.size === 3);

      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
      assert.isTrue(calls.tauriApi.has('plugin:updater|download_and_install'));
      assert.isTrue(calls.tauriApi.has('plugin:process|restart'));
    });
  });

  it('Opens info popup', async () => {
    const { promises } = mockApi();
    const appDiv = getAppDiv();

    document.body.appendChild(appDiv);

    const teleportMountOptions = getTeleportMountOptions(appDiv);
    const wrapper = await mountSettingsAndOpen(teleportMountOptions);

    const infoWrapper = findByTestId(wrapper, 'info');
    await infoWrapper.trigger('click');
    await Promise.all(promises);

    assert.strictEqual(openedPopup.value, POPUP_TYPE.INFO);
    assert.isTrue(findByTestId(wrapper, 'popup-info').isVisible());

    wrapper.getComponent(PopupInfo).vm.$emit('close');
    await nextTick();

    assert.isUndefined(openedPopup.value);
    assert.isFalse(findByTestId(wrapper, 'popup-info').exists());
  });

  describe('Account menu item', () => {
    it('Opens and closes change password popup', async () => {
      const appDiv = getAppDiv();

      document.body.appendChild(appDiv);

      const teleportMountOptions = getTeleportMountOptions(appDiv);
      const wrapper = await mountSettingsAndOpen(teleportMountOptions);

      s.syncState.isLoggedIn = true;
      await nextTick();

      const changePasswordWrapper = findByTestId(wrapper, 'change-password');
      await changePasswordWrapper.trigger('click');

      assert.strictEqual(openedPopup.value, POPUP_TYPE.CHANGE_PASSWORD);
      assert.isTrue(findByTestId(wrapper, 'popup-change-password').isVisible());

      wrapper.getComponent(PopupChangePassword).vm.$emit('close');
      await nextTick();

      assert.isUndefined(openedPopup.value);
      assert.isFalse(findByTestId(wrapper, 'popup-change-password').exists());
    });

    it('Delete account menu item', async () => {
      const { calls, promises } = mockApi();
      const wrapper = await mountSettingsAndOpen();
      assert.isFalse(findByTestId(wrapper, 'delete-account').exists());
      assertMenuItemCount(wrapper, 3);

      s.syncState.username = 'd';
      s.syncState.isLoggedIn = true;
      await TokenStore.setAccessToken('d', 'test-token');
      await nextTick();

      clearMockApiResults({ calls, promises });

      const deleteAccountWrapper = findByTestId(wrapper, 'delete-account');
      assert.isTrue(deleteAccountWrapper.isVisible());
      assertMenuItemCount(wrapper, 5);

      const deleteAccountSpy = vi.spyOn(a, 'deleteAccount');
      await deleteAccountWrapper.trigger('click');

      await waitUntil(() => !findByTestId(wrapper, 'delete-account').exists());

      expect(deleteAccountSpy).toHaveBeenCalledOnce();
      assertMenuItemCount(wrapper, 3);
      assert.strictEqual(calls.size, 5);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assertRequest('/account/delete', calls.request[0]!.calledWith!);
      assert.isTrue(calls.invoke.has('get_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
      assert.isTrue(calls.invoke.has('delete_access_token'));
      assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'd' });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: false,
        },
      });
    });
  });
});
