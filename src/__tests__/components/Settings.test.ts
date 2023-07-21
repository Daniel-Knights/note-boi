import { mount } from '@vue/test-utils';
import { DefineComponent, nextTick } from 'vue';

import * as n from '../../store/note';
import * as s from '../../store/sync';
import * as updateStore from '../../store/update';
import { STORAGE_KEYS } from '../../constant';
import { openedPopup, PopupType } from '../../store/popup';
import { COLOUR_THEMES, selectedTheme } from '../../store/theme';
import { updateAvailable } from '../../store/update';
import { mockTauriApi } from '../tauri';
import { findByTestId, getByTestId } from '../utils';

import DropMenu from '../../components/DropMenu.vue';
import PopupChangePassword from '../../components/PopupChangePassword.vue';
import PopupInfo from '../../components/PopupInfo.vue';
import Settings from '../../components/Settings.vue';

async function mountSettingsAndOpen(options?: Record<string, unknown>) {
  const wrapper = mount(Settings as DefineComponent, options);

  await findByTestId(wrapper, 'settings-button').trigger('click');

  return wrapper;
}

describe('Settings', () => {
  it('Mounts', () => {
    const wrapper = mount(Settings as DefineComponent);
    assert.isTrue(wrapper.isVisible());
  });

  it('Opens and closes drop menu', async () => {
    const wrapper = mount(Settings as DefineComponent);
    assert.isTrue(wrapper.isVisible());
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());
    const settingsButtonWrapper = findByTestId(wrapper, 'settings-button');

    await settingsButtonWrapper.trigger('click');

    assert.isTrue(wrapper.vm.show);
    assert.isTrue(findByTestId(wrapper, 'drop-menu').isVisible());

    await settingsButtonWrapper.trigger('click');

    assert.isFalse(wrapper.vm.show);
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());

    await settingsButtonWrapper.trigger('click');
    assert.isTrue(wrapper.vm.show);
    assert.isTrue(findByTestId(wrapper, 'drop-menu').isVisible());

    await wrapper.getComponent(DropMenu).vm.$emit('close');

    assert.isFalse(wrapper.vm.show);
    await nextTick();
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());
  });

  it('Sets theme preference', async () => {
    const wrapper = await mountSettingsAndOpen();

    // eslint-disable-next-line no-restricted-syntax
    for (const theme of COLOUR_THEMES) {
      const currentThemeWrapper = getByTestId(wrapper, theme);
      assert.isFalse(currentThemeWrapper.classes('drop-menu__item--selected'));

      // eslint-disable-next-line no-await-in-loop
      await currentThemeWrapper.trigger('click');

      assert.strictEqual(selectedTheme.value, theme);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.THEME), theme);
      assert.isTrue(currentThemeWrapper.classes('drop-menu__item--selected'));
    }
  });

  it('Exports all notes', async () => {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    mockTauriApi();

    const wrapper = await mountSettingsAndOpen({
      attachTo: appDiv,
      global: {
        stubs: { teleport: true },
      },
    });

    const exportNotesSpy = vi.spyOn(n, 'exportNotes');

    const exportWrapper = findByTestId(wrapper, 'export');
    await exportWrapper.trigger('click');

    expect(exportNotesSpy).toHaveBeenCalledOnce();
    expect(exportNotesSpy).toHaveBeenCalledWith();
  });

  it('Opens and closes info popup', async () => {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);
    mockTauriApi();

    const wrapper = await mountSettingsAndOpen({
      attachTo: appDiv,
      global: {
        stubs: { teleport: true },
      },
    });

    const infoWrapper = findByTestId(wrapper, 'info');
    await infoWrapper.trigger('click');

    assert.strictEqual(openedPopup.value, PopupType.Info);
    assert.isTrue(findByTestId(wrapper, 'popup-info').isVisible());

    await wrapper.getComponent(PopupInfo).vm.$emit('close');

    assert.isUndefined(openedPopup.value);
    assert.isFalse(findByTestId(wrapper, 'popup-info').exists());
  });

  it('Update menu item', async () => {
    const wrapper = await mountSettingsAndOpen();
    const wrapperVm = wrapper.vm as unknown as { menuItems: [] };
    assert.isFalse(findByTestId(wrapper, 'update').exists());
    assert.strictEqual(wrapperVm.menuItems.length, 3);

    updateAvailable.value = { shouldUpdate: true };
    await nextTick();

    const updateWrapper = findByTestId(wrapper, 'update');
    assert.isTrue(updateWrapper.isVisible());
    assert.strictEqual(wrapperVm.menuItems.length, 4);

    const updateSpy = vi.spyOn(updateStore, 'updateAndRelaunch');
    await updateWrapper.trigger('click');

    expect(updateSpy).toHaveBeenCalledOnce();
  });

  describe('Account menu item', () => {
    it('Opens and closes change password popup', async () => {
      const appDiv = document.createElement('div');
      appDiv.id = 'app';
      document.body.appendChild(appDiv);
      mockTauriApi();

      const wrapper = await mountSettingsAndOpen({
        attachTo: appDiv,
        global: {
          stubs: { teleport: true },
        },
      });

      s.syncState.token = 'token';
      await nextTick();

      const changePasswordWrapper = findByTestId(wrapper, 'change-password');
      await changePasswordWrapper.trigger('click');

      assert.strictEqual(openedPopup.value, PopupType.ChangePassword);
      assert.isTrue(findByTestId(wrapper, 'popup-change-password').isVisible());

      await wrapper.getComponent(PopupChangePassword).vm.$emit('close');

      assert.isUndefined(openedPopup.value);
      assert.isFalse(findByTestId(wrapper, 'popup-change-password').exists());
    });

    it('Delete account menu item', async () => {
      const wrapper = await mountSettingsAndOpen();
      const wrapperVm = wrapper.vm as unknown as { menuItems: [] };
      assert.isFalse(findByTestId(wrapper, 'delete-account').exists());
      assert.strictEqual(wrapperVm.menuItems.length, 3);

      s.syncState.username = 'd';
      s.syncState.token = 'token';
      await nextTick();

      const deleteAccountWrapper = findByTestId(wrapper, 'delete-account');
      assert.isTrue(deleteAccountWrapper.isVisible());
      assert.strictEqual(wrapperVm.menuItems.length, 4);

      const deleteAccountSpy = vi.spyOn(s, 'deleteAccount');
      await deleteAccountWrapper.trigger('click');
      // Await ask dialog
      await new Promise((res) => {
        setTimeout(res);
      });

      expect(deleteAccountSpy).toHaveBeenCalledOnce();

      s.syncState.token = '';
      await nextTick();

      assert.isFalse(findByTestId(wrapper, 'delete-account').exists());
      assert.strictEqual(wrapperVm.menuItems.length, 3);
    });
  });
});
