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
import { onBeforeUnmount } from 'vue';

const emit = defineEmits(['close']);

function closePopup() {
  document.removeEventListener('keydown', keyboardCloseHandler);
  document.removeEventListener('mousedown', clickCloseHandler);

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
  document.body.addEventListener('mousedown', clickCloseHandler);
});

onBeforeUnmount(closePopup);
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
  max-width: 400px;
  color: var(--colour__primary);
  background-color: var(--colour__secondary);
}
</style>
