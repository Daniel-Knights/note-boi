<template>
  <button class="note-menu-toggle button" title="Toggle note menu">
    <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="0" y1="1.25" x2="24" y2="1.25"></line>
      <line x1="0" y1="9" x2="24" y2="9"></line>
      <line x1="0" y1="16.75" x2="24" y2="16.75"></line>
    </svg>
  </button>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
@use 'sass:math';

@use '../sass/vars' as v;

.note-menu-toggle {
  @include v.flex-x(center, center);
  position: absolute;
  top: math.div(v.$editor-header-height, 2);
  left: v.$utility-button-spacing-x;
  @include v.equal-dimensions(v.$utility-button-width);
  transform: translateY(-50%);
  z-index: 100;

  svg {
    @include v.equal-dimensions(24px);
  }
}
</style>
