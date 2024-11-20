<template>
  <li
    v-for="item in items"
    :key="item.label"
    v-on="item.clickHandler ? { click: item.clickHandler } : {}"
    :class="[
      {
        'drop-menu__item--disabled': item.disabled,
        'drop-menu__item--selected': item.selected,
        'drop-menu__item--danger': item.danger,
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
@use '../sass/vars' as v;

.drop-menu__item--disabled {
  pointer-events: none;
  color: var(--colour__tertiary);
}

.drop-menu__item--selected {
  background-color: var(--colour__tertiary);
}

.drop-menu__item--danger {
  background-color: var(--colour__danger);
}

.drop-menu__item--has-sub-menu {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    @include v.equal-dimensions(0.6em);
    background-color: var(--colour__secondary);
    clip-path: polygon(0 0, 0 100%, 100% 100%);
  }

  > ul {
    display: none;
    top: -(v.$drop-menu-padding);
    right: calc(100% + v.$drop-menu-padding);
  }

  &:hover {
    &::before {
      display: none;
    }

    > ul {
      display: block;
    }
  }
}
</style>
