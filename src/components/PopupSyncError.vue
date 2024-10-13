<template>
  <Popup @close="emit('close')" data-test-id="popup-error">
    <div class="sync-error__message" data-test-id="error-message">
      Error: {{ syncState.error.message }}
    </div>
    <button @click="tryAgain" class="sync-error__button button" data-test-id="try-again">
      Try again?
    </button>
  </Popup>
</template>

<script lang="ts" setup>
import { ErrorType, logout, pull, push, resetError, syncState } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

function tryAgain() {
  const errorType = syncState.error.type;

  resetError();
  emit('close');

  switch (errorType) {
    case ErrorType.Push:
      push();
      break;
    case ErrorType.Pull:
      pull();
      break;
    case ErrorType.Logout:
      logout();
      break;
  }
}
</script>

<style lang="scss" scoped>
.sync-error__message {
  font-size: 20px;
  font-weight: 600;
}

.sync-error__button {
  margin-top: 12px;
  text-decoration: underline;

  &:hover {
    cursor: pointer;
    text-decoration: none;
  }
}
</style>
