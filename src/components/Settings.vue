<template>
  <div id="settings">
    <button @click.stop="show = !show" class="button" data-test-id="settings-button">
      <CogIcon />
    </button>
    <DropMenu v-if="show" @close="show = false" :items="menuItems" />
  </div>
  <PopupInfo v-if="openedPopup === PopupType.Info" @close="openedPopup = undefined" />
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { openedPopup, PopupType } from '../store/popup';
import { deleteAccount, syncState } from '../store/sync';
import { COLOUR_THEMES, selectedTheme, setTheme } from '../store/theme';
import { updateAndRelaunch, updateAvailable } from '../store/update';

import { DropMenuItemData } from './types';

import DropMenu from './DropMenu.vue';
import PopupInfo from './PopupInfo.vue';
import CogIcon from './svg/CogIcon.vue';

const show = ref(false);

const menuItems = reactive<DropMenuItemData[]>([
  {
    label: 'Theme',
    subMenu: COLOUR_THEMES.map((theme) => ({
      label: theme,
      testId: theme,
      clickHandler: () => setTheme(theme),
      selected: computed(() => selectedTheme.value === theme),
    })),
  },
  {
    label: 'Info',
    testId: 'info',
    clickHandler: () => {
      openedPopup.value = PopupType.Info;
    },
  },
]);

watch(updateAvailable, () => {
  if (!updateAvailable.value?.shouldUpdate) return;

  menuItems.unshift({
    label: 'Update and restart',
    testId: 'update',
    clickHandler: () => updateAndRelaunch(),
  });
});

watch(syncState, () => {
  const deleteAccountLabel = 'Delete account';
  const hasDeleteAccountItem = menuItems.some(
    (item) => item.label === deleteAccountLabel
  );

  if (syncState.token && !hasDeleteAccountItem) {
    menuItems.push({
      label: deleteAccountLabel,
      testId: 'delete-account',
      confirm: true,
      clickHandler: () => deleteAccount(),
    });
  } else if (!syncState.token && hasDeleteAccountItem) {
    menuItems.pop();
  }
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
