<template>
  <Teleport to="#app">
    <div class="popup" v-bind="$attrs">
      <div class="popup__content">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue';

const emit = defineEmits(['close']);

const hasClosed = ref(false);

function closePopup() {
  // Prevent unmount calling this a 2nd time
  if (hasClosed.value) return;
  hasClosed.value = true;

  window.removeEventListener('keydown', keyboardCloseHandler);
  document.body.removeEventListener('mouseup', clickCloseHandler);

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

window.addEventListener('keydown', keyboardCloseHandler);
document.body.addEventListener('mousedown', clickCloseHandler);

onBeforeUnmount(closePopup);
</script>

<style lang="scss" scoped>
@use '../sass/vars' as v;

.popup {
  @include v.flex-x(center, center);
  position: fixed;
  @include v.cover;
  @include v.equal-dimensions(100%);
  text-align: center;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 100;

  &__content {
    padding: 1em;
    max-width: 400px;
    color: var(--colour__primary);
    background-color: var(--colour__secondary);
  }
}
</style>
