import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import * as u from '../../../store/update';
import { Storage } from '../../../classes';
import { COLOUR_THEMES } from '../../../constant';
import { openedPopup, POPUP_TYPE } from '../../../store/popup';
import { selectedTheme } from '../../../store/theme';
import { clearMockApiResults, mockApi } from '../../api';
import {
  assertRequest,
  findByTestId,
  getAppDiv,
  getByTestId,
  getTeleportMountOptions,
  resolveImmediate,
  waitUntil,
} from '../../utils';

import DropMenu from '../../../components/DropMenu.vue';
import PopupChangePassword from '../../../components/PopupChangePassword.vue';
import PopupInfo from '../../../components/PopupInfo.vue';
import Settings from '../../../components/Settings.vue';

async function mountSettingsAndOpen(options?: Record<string, unknown>) {
  const wrapper = mount(Settings, options);

  await findByTestId(wrapper, 'settings-button').trigger('click');

  return wrapper;
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

    await settingsButtonWrapper.trigger('click');

    assert.isFalse(wrapperVm.show);
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());

    await settingsButtonWrapper.trigger('click');
    assert.isTrue(wrapperVm.show);
    assert.isTrue(findByTestId(wrapper, 'drop-menu').isVisible());

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

  it('Exports all notes', async () => {
    const { calls, promises } = mockApi();
    const wrapper = await mountSettingsAndOpen();
    const exportNotesSpy = vi.spyOn(n, 'exportNotes');
    const exportWrapper = findByTestId(wrapper, 'export');

    await exportWrapper.trigger('click');
    await Promise.all(promises);
    await resolveImmediate(); // Defer execution to exportNotes

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith(n.noteState.notes);
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.tauriApi.has('plugin:dialog|open'));
    assert.isTrue(calls.invoke.has('export_notes'));
  });

  it('Sets update strategy', async () => {
    const { calls, promises } = mockApi();
    const wrapper = await mountSettingsAndOpen();
    const setUpdateStrategySpy = vi.spyOn(u, 'setUpdateStrategy');
    const updateAutoWrapper = findByTestId(wrapper, 'update-auto');

    assert.strictEqual(u.updateState.strategy, 'manual');
    assert.isNull(Storage.get('UPDATE_STRATEGY'));

    await updateAutoWrapper.trigger('click');
    await Promise.all(promises);

    expect(setUpdateStrategySpy).toHaveBeenCalledOnce();
    expect(setUpdateStrategySpy).toHaveBeenCalledWith('auto');
    assert.strictEqual(calls.size, 0);
    assert.strictEqual(u.updateState.strategy, 'auto');
    assert.strictEqual(Storage.get('UPDATE_STRATEGY'), 'auto');

    const updateManualWrapper = findByTestId(wrapper, 'update-manual');

    vi.clearAllMocks();

    await updateManualWrapper.trigger('click');
    await Promise.all(promises);

    expect(setUpdateStrategySpy).toHaveBeenCalledOnce();
    expect(setUpdateStrategySpy).toHaveBeenCalledWith('manual');
    assert.strictEqual(calls.size, 0);
    assert.strictEqual(u.updateState.strategy, 'manual');
    assert.strictEqual(Storage.get('UPDATE_STRATEGY'), 'manual');
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

  it('Update and restart menu item', async () => {
    const { calls, promises } = mockApi();
    const wrapper = await mountSettingsAndOpen();
    const wrapperVm = wrapper.vm as unknown as { menuItems: [] };
    assert.isFalse(findByTestId(wrapper, 'update-restart').exists());
    assert.lengthOf(wrapperVm.menuItems, 4);

    await u.handleUpdate();
    await nextTick();

    const updateWrapper = findByTestId(wrapper, 'update-restart');
    assert.isTrue(updateWrapper.isVisible());
    assert.lengthOf(wrapperVm.menuItems, 5);

    clearMockApiResults({ calls, promises });

    await updateWrapper.trigger('click');
    await waitUntil(() => calls.size === 3);

    assert.strictEqual(calls.size, 3);
    assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
    assert.isTrue(calls.tauriApi.has('plugin:updater|download_and_install'));
    assert.isTrue(calls.tauriApi.has('plugin:process|restart'));
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
      const wrapperVm = wrapper.vm as unknown as { menuItems: [] };
      assert.isFalse(findByTestId(wrapper, 'delete-account').exists());
      assert.lengthOf(wrapperVm.menuItems, 4);

      s.syncState.username = 'd';
      s.syncState.isLoggedIn = true;

      await nextTick();

      clearMockApiResults({ calls, promises });

      const deleteAccountWrapper = findByTestId(wrapper, 'delete-account');
      assert.isTrue(deleteAccountWrapper.isVisible());
      assert.lengthOf(wrapperVm.menuItems, 5);

      const deleteAccountSpy = vi.spyOn(s, 'deleteAccount');
      await deleteAccountWrapper.trigger('click');

      await waitUntil(() => !findByTestId(wrapper, 'delete-account').exists());

      expect(deleteAccountSpy).toHaveBeenCalledOnce();
      assert.lengthOf(wrapperVm.menuItems, 4);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assertRequest('/account/delete', calls.request[0]!.calledWith!);
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
