import { enableAutoUnmount, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { STORAGE_KEYS } from '../../constant';
import { openedPopup, PopupType } from '../../store/popup';
import { COLOUR_THEMES, selectedTheme } from '../../store/theme';
import { mockTauriApi } from '../tauri';
import { findByTestId, getByTestId, setCrypto } from '../utils';

import Settings from '../../components/Settings.vue';

async function mountSettingsAndOpen(options?: Record<string, unknown>) {
  const wrapper = mount(Settings, options);

  await findByTestId(wrapper, 'settings-button').trigger('click');

  return wrapper;
}

beforeAll(setCrypto);
enableAutoUnmount(afterEach);

describe('Settings', () => {
  it('Mounts', () => {
    const wrapper = mount(Settings);
    assert.isTrue(wrapper.isVisible());
  });

  it('Opens and closes on click', async () => {
    const wrapper = mount(Settings);
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
    document.body.click();

    assert.isFalse(wrapper.vm.show);
    await nextTick();
    assert.isFalse(findByTestId(wrapper, 'drop-menu').exists());
  });

  it('Sets theme preference', async () => {
    const wrapper = await mountSettingsAndOpen();

    async function testThemeSelect(i: number) {
      const theme = COLOUR_THEMES[i];
      const currentThemeWrapper = getByTestId(wrapper, theme);
      assert.isFalse(currentThemeWrapper.classes('drop-menu__item--selected'));

      await currentThemeWrapper.trigger('click');

      assert.strictEqual(selectedTheme.value, theme);
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.THEME), theme);
      assert.isTrue(currentThemeWrapper.classes('drop-menu__item--selected'));

      if (i < COLOUR_THEMES.length - 1) {
        testThemeSelect(i + 1);
      }
    }

    await testThemeSelect(0);
  });

  it('Opens info popup', async () => {
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
  });
});
