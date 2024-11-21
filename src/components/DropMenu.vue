<template>
  <ul class="drop-menu" data-test-id="drop-menu">
    <li
      v-for="item in items"
      :key="item.label"
      v-on="item.clickHandler ? { click: item.clickHandler } : {}"
      class="drop-menu__item"
      :class="{
        'drop-menu__item--disabled': item.disabled,
        'drop-menu__item--selected': item.selected,
        'drop-menu__item--danger': item.danger,
        'drop-menu__item--has-sub-menu': item.subMenu,
      }"
      :data-test-id="item.testId"
    >
      {{ item.label }}
      <DropMenu v-if="item.subMenu" :items="item.subMenu" />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';

import { DropMenuItemData } from './types';

defineProps<{ items: DropMenuItemData[] }>();

const emit = defineEmits(['close']);

function close() {
  emit('close');
}

onMounted(() => {
  document.addEventListener('click', close, { once: true });
});
</script>

<style lang="scss" scoped>
@use '../sass/vars' as v;

$list-bg-colour: var(--colour__interactive);

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
  padding: 0.5em 1em;
  white-space: nowrap;
  border: v.$drop-menu-padding solid $list-bg-colour;

  &:hover {
    background-color: var(--colour__tertiary);
  }
}

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
    @include v.equal-dimensions(0.5em);
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
