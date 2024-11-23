<template>
  <div id="settings">
    <button @click.stop="show = !show" class="button" data-test-id="settings-button">
      <CogIcon />
    </button>
    <DropMenu v-if="show" @close="show = false" :items="menuItems" />
  </div>
  <PopupInfo v-if="openedPopup === PopupType.Info" @close="openedPopup = undefined" />
  <PopupChangePassword
    v-if="openedPopup === PopupType.ChangePassword"
    @close="openedPopup = undefined"
  />
</template>

<script lang="ts" setup>
import { check } from '@tauri-apps/plugin-updater';
import { computed, ref } from 'vue';

import { exportNotes, noteState } from '../store/note';
import { openedPopup, PopupType } from '../store/popup';
import { deleteAccount, syncState } from '../store/sync';
import { COLOUR_THEMES, selectedTheme, setTheme } from '../store/theme';
import {
  setUpdateStrategy,
  UPDATE_STRATEGIES,
  updateAndRelaunch,
  updateState,
} from '../store/update';
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
        openedPopup.value = PopupType.Info;
      },
    },
  ];

  if (updateState.isAvailable) {
    items.unshift({
      label: 'Update and restart',
      testId: 'update-restart',
      clickHandler: async () => {
        const update = await check();
        if (!update?.available) return;

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
            openedPopup.value = PopupType.ChangePassword;
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
