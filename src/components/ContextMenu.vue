<template>
  <ul class="context-menu" :style="{ top: top + 'px', left: left + 'px' }">
    <li>New Note</li>
    <li>Delete Note</li>
    <li class="context-menu__has-sub-menu">
      Theme
      <ul>
        <li>Light</li>
        <li>Dark</li>
        <li>System</li>
      </ul>
    </li>
  </ul>
</template>

<script lang="ts" setup>
defineProps({
  top: {
    type: Number,
    default: 0,
    required: true,
  },
  left: {
    type: Number,
    default: 0,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
$list-padding: 3px;
$list-bg-color: var(--color__interactive);

ul {
  position: absolute;
  color: var(--color__secondary);
  background-color: $list-bg-color;
  z-index: 10;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);

  li {
    cursor: pointer;
    padding: 0.5em 1em;
    white-space: nowrap;
    border: $list-padding solid $list-bg-color;

    &:hover {
      color: var(--color__primary);
      background-color: var(--color__tertiary);
    }
  }
}

.context-menu__has-sub-menu {
  position: relative;

  &:hover {
    > ul {
      display: block;
    }
  }

  > ul {
    display: none;
    top: 0;
    left: calc(100% + $list-padding);
  }
}
</style>
