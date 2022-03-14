<template>
  <Teleport to="body">
    <div id="popup">
      <div class="popup__content">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
const emit = defineEmits(['close']);

function keyboardCloseHandler(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'Enter') {
    emit('close');

    document.removeEventListener('keydown', keyboardCloseHandler);
  }
}
function clickCloseHandler(event: MouseEvent) {
  if (!(event.target as HTMLElement)?.closest('#popup')) {
    document.removeEventListener('click', clickCloseHandler);

    emit('close');
  }
}

// setTimeout prevents immediate close
setTimeout(() => {
  document.addEventListener('keydown', keyboardCloseHandler);
  document.addEventListener('click', clickCloseHandler);
});
</script>

<style lang="scss" scoped>
#popup {
  pointer-events: none;
  @include v.flex-x(center, center);
  position: fixed;
  @include v.cover;
  @include v.equal-dimensions(100%);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.popup__content {
  pointer-events: all;
}
</style>
