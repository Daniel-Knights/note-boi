<template>
  <Popup>
    <div>{{ state.error }}</div>
    <button @click="tryAgain">Try Again?</button>
  </Popup>
</template>

<script lang="ts" setup>
import { state, resetError, push, ErrorType, logout, pull } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

function tryAgain() {
  switch (state.error.type) {
    case ErrorType.Push:
      push();
      break;
    case ErrorType.Pull:
      pull();
      break;
    case ErrorType.Logout:
      logout();
      break;
    // no default
  }

  resetError();
  emit('close');
}
</script>

<style lang="scss"></style>
