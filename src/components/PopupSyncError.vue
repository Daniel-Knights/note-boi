<template>
  <Popup @close="emit('close')" data-test-id="popup-error">
    <div class="sync-error__message" data-test-id="error-message">
      Error: {{ syncState.appError.message || 'Something went wrong' }}
    </div>
    <div>
      <button
        v-if="syncState.appError.retryConfig"
        @click="tryAgain"
        class="sync-error__button button button--default"
        data-test-id="try-again"
      >
        Try again
      </button>
      <button
        @click="ignore"
        class="sync-error__button button button--default"
        data-test-id="ignore"
      >
        Ignore
      </button>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { clientSideLogout } from '../api';
import { resetAppError, syncState } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

function tryAgain() {
  const retryFn = syncState.appError.retry;

  resetAppError();
  emit('close');
  retryFn?.();
}

function ignore() {
  resetAppError();
  clientSideLogout();
  emit('close');
}
</script>

<style lang="scss" scoped>
.sync-error__message {
  max-width: 250px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.sync-error__button {
  display: block;
  margin: 12px auto 0;
  width: 150px;
}
</style>
