<template>
  <ul
    @keydown="handleKeydown"
    @focusout="handleFocusOut"
    class="drop-menu"
    role="menu"
    ref="menu"
    data-test-id="drop-menu"
  >
    <li
      v-for="item in filteredItems"
      :key="item.label"
      v-on="handleClickHandler(item.clickHandler)"
      class="drop-menu__item"
      role="menuitem"
      tabindex="0"
      :aria-haspopup="item.subMenu ? 'menu' : undefined"
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
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

import { DropMenuItemData } from '../types';

const emit = defineEmits(['close']);
const props = defineProps<{
  items: DropMenuItemData[];
  closeOnClick?: boolean;
}>();

const menu = useTemplateRef('menu');
const previouslyFocused = document.activeElement as HTMLElement | null;

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

function isTopLevel() {
  return !menu.value?.parentElement?.closest('.drop-menu');
}

function getSiblingItems(): HTMLElement[] {
  return Array.from(menu.value?.children ?? []).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.matches('.drop-menu__item')
  );
}

/** Keyboard support: Enter activates the focused item, Escape closes. */
function handleKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') {
    emit('close'); // Not stopped, so it bubbles up from sub-menus to the top-level menu

    return;
  }

  const item = (ev.target as HTMLElement).closest<HTMLElement>('.drop-menu__item');

  if (ev.key === 'Enter' && item && ev.target === item) {
    ev.preventDefault();
    ev.stopPropagation();
    item.click();
  }
}

/** Close when focus tabs out of the top-level menu. */
function handleFocusOut(ev: FocusEvent) {
  if (!isTopLevel()) return;

  const next = ev.relatedTarget;
  if (next instanceof Element && !menu.value?.contains(next)) {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  if (!isTopLevel()) return;

  // Only move focus into the menu if it was opened with the keyboard
  let openedWithKeyboard = false;

  try {
    openedWithKeyboard = !!previouslyFocused?.matches(':focus-visible');
  } catch {
    // `:focus-visible` unsupported
  }

  if (openedWithKeyboard) {
    getSiblingItems()[0]?.focus();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);

  if (!isTopLevel()) return;

  // Return focus to the opener, unless focus has already gone elsewhere
  const active = document.activeElement;
  const focusInMenu = active === document.body || !!menu.value?.contains(active);

  if (focusInMenu && previouslyFocused?.isConnected) {
    previouslyFocused.focus();
  }
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

  &:hover,
  &:focus-within {
    &::before {
      display: none;
    }

    > ul {
      display: block;
    }
  }
}
</style>
