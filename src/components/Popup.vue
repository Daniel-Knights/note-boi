<template>
  <Teleport to="#app">
    <div id="popup">
      <div class="popup__content">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
const emit = defineEmits(['close']);

function closePopup() {
  document.removeEventListener('keydown', keyboardCloseHandler);
  document.removeEventListener('click', clickCloseHandler);

  emit('close');
}

function keyboardCloseHandler(event: KeyboardEvent) {
  if (event.key === 'Escape') closePopup();
}
function clickCloseHandler(event: MouseEvent) {
  if (!(event.target as HTMLElement)?.closest('.popup__content')) {
    closePopup();
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
  @include v.flex-x(center, center);
  position: fixed;
  @include v.cover;
  @include v.equal-dimensions(100%);
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.popup__content {
  padding: 1em;
  color: var(--color__primary);
  background-color: var(--color__secondary);
}
</style>
