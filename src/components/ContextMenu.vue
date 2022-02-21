<template>
  <ul class="context-menu" :style="{ top: top + 'px', left: left + 'px' }">
    <li>New Note</li>
    <li>Delete Note</li>
    <li>
      Theme
      <ul class="context-menu__sub-menu">
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
.context-menu {
  position: absolute;
  background-color: var(--color__primary);
  z-index: 10;
}

.context-menu__sub-menu {
  display: none;
  position: absolute;
  top: 0;
  left: 100%;
  background-color: var(--color__primary);
  z-index: 10;
}
</style>
