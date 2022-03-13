<template>
  <Teleport to="body">
    <div id="popup">
      <div class="popup__content">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup></script>

<style lang="scss">
#popup {
  @include v.flex-x(center, center);
  position: fixed;
  @include v.cover;
  @include v.equal-dimensions(100%);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 100;
}
</style>
