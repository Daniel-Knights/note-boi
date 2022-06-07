<template>
  <div id="settings">
    <button @click.stop="show = !show">
      <CogIcon />
    </button>
    <DropMenu v-if="show" @close="show = false" :items="menuItems" />
  </div>
  <PopupInfo v-if="openedPopup === PopupType.Info" @close="openedPopup = undefined" />
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { openedPopup, PopupType } from '../store/popup';
import { state } from '../store/sync';
import { colourThemes, selectedTheme, setTheme } from '../store/theme';
import { updateAndRelaunch, updateAvailable } from '../store/update';

import { DropMenuItemData } from './types';

import DropMenu from './DropMenu.vue';
import PopupInfo from './PopupInfo.vue';
import CogIcon from './svg/CogIcon.vue';

const show = ref(false);

const menuItems = reactive<DropMenuItemData[]>([
  {
    label: 'Theme',
    subMenu: colourThemes.map((theme) => ({
      label: theme,
      clickHandler: () => setTheme(theme),
      selected: computed(() => selectedTheme.value === theme),
    })),
  },
  {
    label: 'Info',
    clickHandler: () => {
      openedPopup.value = PopupType.Info;
    },
  },
  {
    label: 'Delete account',
    clickHandler: () => null, // TODO
  },
]);

watch(updateAvailable, () => {
  if (!updateAvailable.value?.shouldUpdate) return;

  menuItems.unshift({
    label: 'Update and restart',
    clickHandler: () => updateAndRelaunch(),
  });
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
