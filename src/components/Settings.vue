<template>
  <div id="settings">
    <button @click.stop="show = !show" class="button" data-test-id="settings-button">
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

import { deleteAccount } from '../api';
import { COLOUR_THEMES, UPDATE_STRATEGIES } from '../constant';
import { exportNotes, noteState } from '../store/note';
import { openedPopup, POPUP_TYPE } from '../store/popup';
import { syncState } from '../store/sync';
import { selectedTheme, setTheme } from '../store/theme';
import { setUpdateStrategy, updateAndRelaunch, updateState } from '../store/update';
import { capitalise } from '../utils';

import { DropMenuItemData } from './types';

import DropMenu from './DropMenu.vue';
import PopupChangePassword from './PopupChangePassword.vue';
import PopupInfo from './PopupInfo.vue';
import CogIcon from './svg/CogIcon.vue';

const show = ref(false);

const menuItems = computed(() => {
  const items: DropMenuItemData[] = [
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
      label: 'Export',
      testId: 'export',
      clickHandler: () => exportNotes(noteState.notes.map((nt) => nt.id)),
    },
    {
      label: 'Updates',
      subMenu: UPDATE_STRATEGIES.map((strategy) => ({
        label: capitalise(strategy),
        testId: `update-${strategy}`,
        selected: updateState.strategy === strategy,
        clickHandler: () => setUpdateStrategy(strategy),
      })),
    },
    {
      label: 'Info',
      testId: 'info',
      clickHandler: () => {
        openedPopup.value = POPUP_TYPE.INFO;
      },
    },
  ];

  if (updateState.isAvailable) {
    items.unshift({
      label: 'Update and restart',
      testId: 'update-restart',
      clickHandler: async () => {
        const update = await check();
        if (!update) return;

        updateAndRelaunch(update);
      },
    });
  }

  if (syncState.isLoggedIn) {
    items.push({
      label: 'Account',
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
    });
  }

  return items;
});
</script>

<style lang="scss" scoped>
#settings {
  position: relative;

  .drop-menu {
    right: 0;
    bottom: -12px;
    transform: translateY(100%);
  }
}
</style>
