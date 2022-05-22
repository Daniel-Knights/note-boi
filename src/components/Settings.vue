<template>
  <div id="settings">
    <button @click.stop="show = !show">
      <CogIcon />
    </button>
    <DropMenu v-if="show" @close="show = false" :items="menuItems" />
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, watch } from 'vue';

import { colourThemes, setTheme, selectedTheme } from '../store/theme';
import { updateAvailable, updateAndRelaunch } from '../store/update';
import { DropMenuItemData } from './types';

import CogIcon from './svg/CogIcon.vue';
import DropMenu from './DropMenu.vue';

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
    clickHandler: () => null, // TODO
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
