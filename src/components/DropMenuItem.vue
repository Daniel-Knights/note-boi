<template>
  <li
    v-for="item in items"
    :key="item.label"
    v-on="item.clickHandler ? { click: item.clickHandler } : {}"
    :class="[
      {
        'drop-menu__item--disabled': item.disabled,
        'drop-menu__item--selected': item.selected,
        'drop-menu__item--has-sub-menu': item.subMenu,
      },
    ]"
    :data-test-id="item.testId"
  >
    {{ item.label }}
    <ul v-if="item.subMenu">
      <DropMenuItem :items="item.subMenu" />
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { DropMenuItemData } from './types';

defineProps<{ items: DropMenuItemData[] }>();
</script>

<style lang="scss" scoped>
.drop-menu__item--disabled {
  pointer-events: none;
  color: var(--colour__tertiary);
}

.drop-menu__item--has-sub-menu {
  position: relative;

  > ul {
    display: none;
    top: -(v.$drop-menu-padding);
    left: calc(100% + v.$drop-menu-padding);
  }

  &:hover > ul {
    display: block;
  }
}

.drop-menu__item--selected {
  background-color: var(--colour__tertiary);
}
</style>
