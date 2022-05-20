<template>
  <ul class="drop-menu">
    <DropMenuItem :items="items" />
  </ul>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';

import { DropMenuItemData } from './types';

import DropMenuItem from './DropMenuItem.vue';

defineProps<{ items: DropMenuItemData[] }>();

const emit = defineEmits(['close']);

function hide() {
  emit('close');
}

onMounted(() => {
  document.addEventListener('click', hide, { once: true });
});
</script>

<style lang="scss">
$list-bg-colour: var(--colour__interactive);

.drop-menu {
  &,
  ul {
    position: absolute;
    width: 133px;
    color: var(--colour__white);
    background-color: $list-bg-colour;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  li {
    cursor: pointer;
    padding: 0.5em 1em;
    white-space: nowrap;
    border: v.$drop-menu-padding solid $list-bg-colour;

    &:hover {
      background-color: var(--colour__tertiary);
    }
  }
}
</style>
