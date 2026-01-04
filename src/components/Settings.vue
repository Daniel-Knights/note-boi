<template>
  <div id="settings">
    <button
      @click.stop="show = !show"
      class="button"
      data-test-id="settings-button"
      title="Settings"
    >
      <CogIcon />
    </button>
    <DropMenu v-if="show" @close="show = false" :items="menuItems" />
  </div>
  <PopupInfo v-if="openedPopup === POPUP_TYPE.INFO" @close="openedPopup = undefined" />
  <PopupChangePassword
    v-if="openedPopup === POPUP_TYPE.CHANGE_PASSWORD"
    @close="openedPopup = undefined"
  />
</template>

<script lang="ts" setup>
import { check } from '@tauri-apps/plugin-updater';
import { computed, ref } from 'vue';

import { deleteAccount, logout } from '../api';
import { COLOUR_THEMES, UPDATE_STRATEGIES } from '../constant';
import { openedPopup, POPUP_TYPE } from '../store/popup';
import { syncState } from '../store/sync';
import { selectedTheme, setTheme } from '../store/theme';
import { setUpdateStrategy, updateAndRelaunch, updateState } from '../store/update';
import { capitalise, isWeb } from '../utils';

import { DropMenuItemData } from './types';

import DropMenu from './DropMenu.vue';
import PopupChangePassword from './PopupChangePassword.vue';
import PopupInfo from './PopupInfo.vue';
import CogIcon from './svg/CogIcon.vue';

const show = ref(false);

const menuItems = computed<DropMenuItemData[]>(() => [
  {
    label: 'Theme',
    subMenu: COLOUR_THEMES.map((theme) => ({
      label: theme,
      testId: theme,
      clickHandler: () => setTheme(theme),
      selected: selectedTheme.value === theme,
    })),
  },
  {
    label: 'Updates',
    showIf: () => !isWeb(),
    subMenu: [
      ...UPDATE_STRATEGIES.map((strategy) => ({
        label: capitalise(strategy),
        testId: `update-${strategy}`,
        selected: updateState.strategy === strategy,
        clickHandler: () => setUpdateStrategy(strategy),
      })),
      {
        label: 'Update and restart',
        testId: 'update-restart',
        showIf: () => updateState.isAvailable && !isWeb(),
        danger: true,
        clickHandler: async () => {
          const update = await check();
          if (!update) return;

          updateAndRelaunch(update);
        },
      },
    ],
  },
  {
    label: 'Info',
    testId: 'info',
    clickHandler: () => {
      openedPopup.value = POPUP_TYPE.INFO;
    },
  },
  {
    label: 'Account',
    showIf: () => syncState.isLoggedIn,
    subMenu: [
      {
        label: 'Change password',
        testId: 'change-password',
        clickHandler: () => {
          openedPopup.value = POPUP_TYPE.CHANGE_PASSWORD;
        },
      },
      {
        label: 'Delete account',
        testId: 'delete-account',
        danger: true,
        clickHandler: () => deleteAccount(),
      },
    ],
  },
  {
    label: 'Logout',
    showIf: () => syncState.isLoggedIn,
    clickHandler: logout,
  },
]);
</script>

<style lang="scss" scoped>
@use 'sass:math';

@use '../sass/vars' as v;

#settings {
  @include v.flex-y;
  position: absolute;
  top: math.div(v.$editor-header-height, 2);
  right: v.$utility-button-spacing-x;
  transform: translateY(-50%);
  z-index: 10;

  .button {
    @include v.equal-dimensions(v.$utility-button-width);
  }

  .drop-menu {
    right: 0;
    bottom: -12px;
    transform: translateY(100%);
  }
}
</style>
