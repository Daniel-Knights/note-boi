import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import * as n from '../../../store/note';
import * as s from '../../../store/sync';
import * as updateStore from '../../../store/update';
import { STORAGE_KEYS } from '../../../constant';
import { openedPopup, PopupType } from '../../../store/popup';
import { COLOUR_THEMES, selectedTheme } from '../../../store/theme';
import { update } from '../../../store/update';
import { mockApi } from '../../api';
import { findByTestId, getByTestId, resolveImmediate } from '../../utils';

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
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.THEME), theme);
      assert.isTrue(currentThemeWrapper.classes('drop-menu__item--selected'));
    }
  });

  it('Exports all notes', async () => {
    const { calls, promises } = mockApi();
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    const wrapper = await mountSettingsAndOpen({
      attachTo: appDiv,
      global: {
        stubs: { teleport: true },
      },
    });

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

  it('Opens and closes info popup', async () => {
    const { promises } = mockApi();
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    const wrapper = await mountSettingsAndOpen({
      attachTo: appDiv,
      global: {
        stubs: { teleport: true },
      },
    });

    const infoWrapper = findByTestId(wrapper, 'info');
    await infoWrapper.trigger('click');
    await Promise.all(promises);

    assert.strictEqual(openedPopup.value, PopupType.Info);
    assert.isTrue(findByTestId(wrapper, 'popup-info').isVisible());

    wrapper.getComponent(PopupInfo).vm.$emit('close');
    await nextTick();

    assert.isUndefined(openedPopup.value);
    assert.isFalse(findByTestId(wrapper, 'popup-info').exists());
  });

  it('Update menu item', async () => {
    const { calls, promises } = mockApi();
    const wrapper = await mountSettingsAndOpen();
    const wrapperVm = wrapper.vm as unknown as { menuItems: [] };
    assert.isFalse(findByTestId(wrapper, 'update').exists());
    assert.lengthOf(wrapperVm.menuItems, 3);

    // @ts-expect-error - don't need to set all properties
    update.value = {
      available: true,
      downloadAndInstall: () => Promise.resolve(),
    };

    await nextTick();

    const updateWrapper = findByTestId(wrapper, 'update');
    assert.isTrue(updateWrapper.isVisible());
    assert.lengthOf(wrapperVm.menuItems, 4);

    const updateSpy = vi.spyOn(updateStore, 'updateAndRelaunch');
    await updateWrapper.trigger('click');
    await Promise.all(promises);

    expect(updateSpy).toHaveBeenCalledOnce();
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.tauriApi.has('plugin:process|restart'));

    update.value = undefined;
  });

  describe('Account menu item', () => {
    it('Opens and closes change password popup', async () => {
      const appDiv = document.createElement('div');
      appDiv.id = 'app';
      document.body.appendChild(appDiv);

      const wrapper = await mountSettingsAndOpen({
        attachTo: appDiv,
        global: {
          stubs: { teleport: true },
        },
      });

      s.syncState.isLoggedIn = true;
      await nextTick();

      const changePasswordWrapper = findByTestId(wrapper, 'change-password');
      await changePasswordWrapper.trigger('click');

      assert.strictEqual(openedPopup.value, PopupType.ChangePassword);
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
      assert.lengthOf(wrapperVm.menuItems, 3);

      s.syncState.username = 'd';
      s.syncState.isLoggedIn = true;
      await nextTick();

      const deleteAccountWrapper = findByTestId(wrapper, 'delete-account');
      assert.isTrue(deleteAccountWrapper.isVisible());
      assert.lengthOf(wrapperVm.menuItems, 4);

      const deleteAccountSpy = vi.spyOn(s, 'deleteAccount');
      await deleteAccountWrapper.trigger('click');
      await resolveImmediate(); // We can't await the deleteAccount click handler directly
      await Promise.all(promises);
      await resolveImmediate(); // Defer execution to /account/delete

      expect(deleteAccountSpy).toHaveBeenCalledOnce();
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.request.has('/account/delete'));
      assert.isTrue(calls.emits.has('logout'));
      assert.isFalse(findByTestId(wrapper, 'delete-account').exists());
      assert.lengthOf(wrapperVm.menuItems, 3);
    });
  });
});
