<template>
  <div id="sync-status">
    <div v-if="state.isLoading" class="sync-status__loading-spinner"></div>
    <button
      v-else-if="state.error.type !== ErrorType.None"
      @click="emit('popup-error')"
      class="sync-status__error"
      :class="{
        'sync-status__error--clickable': state.error.type === ErrorType.Sync,
      }"
      title="Sync error"
    >
      <svg aria-hidden="true" role="img" viewBox="0 0 24 24">
        <CloudErrorIcon />
      </svg>
    </button>
    <div v-else-if="state.token !== '' && !state.hasUnsyncedNotes" title="Changes synced">
      <CloudTickIcon />
    </div>
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
  right: 24px;

  &,
  svg,
  .sync-status__loading-spinner {
    @include v.equal-dimensions(32px);
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

.sync-status__error {
  pointer-events: none;
}

.sync-status__error--clickable,
.sync-status__sync-button {
  cursor: pointer;
  pointer-events: all;

  &:hover {
    opacity: 0.8;
  }
}
</style>
