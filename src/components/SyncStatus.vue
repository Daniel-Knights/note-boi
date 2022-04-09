<template>
  <div id="sync-status">
    <!-- Loading -->
    <div v-if="state.isLoading" class="sync-status__loading-spinner"></div>
    <!-- Error -->
    <button
      v-else-if="isSyncError"
      @click="emit('popup-error')"
      class="sync-status__error"
      title="Sync error"
    >
      <CloudErrorIcon />
    </button>
    <!-- Sync successful -->
    <div v-else-if="state.token !== '' && !state.hasUnsyncedNotes" title="Changes synced">
      <CloudTickIcon />
    </div>
    <!-- Sync ready -->
    <button
      v-else
      @click="pushNotes"
      class="sync-status__sync-button"
      title="Sync changes"
    >
      <CloudSyncIcon />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { ErrorType, logout, pull, push, state } from '../store/sync';
import { tauriEmit, tauriListen } from '../utils';

import CloudSyncIcon from './svg/CloudSyncIcon.vue';
import CloudTickIcon from './svg/CloudTickIcon.vue';
import CloudErrorIcon from './svg/CloudErrorIcon.vue';

if (state.token) {
  tauriEmit('login');
  pull();
} else {
  tauriEmit('logout');
}

const emit = defineEmits(['popup-auth', 'popup-error']);
const isSyncError = computed(() => {
  switch (state.error.type) {
    case ErrorType.Logout:
    case ErrorType.Pull:
    case ErrorType.Push:
      return true;
    default:
      return false;
  }
});

async function pushNotes() {
  if (!state.token) {
    emit('popup-auth');
  } else {
    await push();
  }
}

tauriListen('push-notes', pushNotes);
tauriListen('pull-notes', pull);
tauriListen('login', () => {
  state.isLogin = true;
  emit('popup-auth');
});
tauriListen('logout', logout);
tauriListen('signup', () => {
  state.isLogin = false;
  emit('popup-auth');
});
</script>

<style lang="scss" scoped>
#sync-status {
  position: absolute;
  bottom: 12px;
  right: v.$sync-icon-right;

  &,
  svg,
  .sync-status__loading-spinner {
    @include v.equal-dimensions(v.$sync-icon-dimensions);
  }
}

.sync-status__loading-spinner {
  display: block;
  border: 5px solid var(--color__interactive);
  border-bottom-color: var(--color__secondary);
  border-radius: 50%;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  to {
    transform: rotate(360deg);
  }
}

.sync-status__error,
.sync-status__sync-button {
  cursor: pointer;
  pointer-events: all;

  &:hover {
    opacity: 0.8;
  }
}
</style>
