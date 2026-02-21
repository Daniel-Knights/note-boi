<template>
  <ul class="drop-menu" data-test-id="drop-menu">
    <li
      v-for="item in filteredItems"
      :key="item.label"
      v-on="handleClickHandler(item.clickHandler)"
      class="drop-menu__item"
      :class="{
        'drop-menu__item--selected': item.selected,
        'drop-menu__item--danger': item.danger,
        'drop-menu__item--has-sub-menu': item.subMenu,
      }"
      :data-test-id="item.testId"
    >
      {{ item.label }}
      <DropMenu
        v-if="item.subMenu"
        :items="item.subMenu"
        :close-on-click="closeOnClick"
      />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';

import { DropMenuItemData } from './types';

const emit = defineEmits(['close']);
const props = defineProps<{
  items: DropMenuItemData[];
  closeOnClick?: boolean;
}>();

const filteredItems = computed(() => {
  return props.items.filter((item) => {
    if (!item.showIf) return true;

    return item.showIf();
  });
});

function handleClickOutside(ev: MouseEvent) {
  if (ev.target instanceof Element && ev.target.closest('.drop-menu')) return;

  emit('close');
}

/**
 * Handles click events and executes the provided callback.
 * Closes menu if `props.closeOnClick` is `true`.
 */
function handleClickHandler(clickHandler?: (() => void) | (() => Promise<void>)) {
  return {
    click: () => {
      if (props.closeOnClick) {
        emit('close');
      }

      clickHandler?.();
    },
  };
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
@use '../sass/vars' as v;

$list-bg-colour: var(--colour__tertiary);

.drop-menu {
  position: absolute;
  min-width: 133px;
  color: var(--colour__white);
  background-color: $list-bg-colour;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.drop-menu__item {
  cursor: pointer;
  position: relative;
  padding: 0.4em 1em;
  font-size: 14px;
  white-space: nowrap;
  border: v.$drop-menu-padding solid $list-bg-colour;

  &:hover {
    background-color: var(--colour__tertiary-light);
  }

  // Increase hover hit box
  &::after {
    content: '';
    position: absolute;
    inset: -10px;
  }
}

.drop-menu__item--selected {
  background-color: var(--colour__tertiary-light);
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
    @include v.equal-dimensions(0.5em);
    background-color: var(--colour__white);
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
