<template>
  <div id="sync-status">
    <!-- Loading -->
    <div
      v-if="state.isLoading"
      class="sync-status__loading-spinner"
      data-test-id="loading"
    ></div>
    <!-- Error -->
    <button
      v-else-if="isSyncError"
      @click="openedPopup = PopupType.Error"
      class="sync-status__error"
      title="Sync error"
      data-test-id="error"
    >
      <CloudErrorIcon />
    </button>
    <!-- Sync successful -->
    <div
      v-else-if="state.token !== '' && state.unsyncedNoteIds.size === 0"
      title="Changes synced"
      data-test-id="success"
    >
      <CloudTickIcon />
    </div>
    <!-- Sync ready -->
    <button
      v-else
      @click="pushNotes"
      class="sync-status__sync-button"
      title="Sync changes"
      data-test-id="sync-button"
    >
      <CloudSyncIcon />
    </button>
  </div>
  <PopupSyncAuth v-if="openedPopup === PopupType.Auth" @close="closeSyncPopup" />
  <PopupSyncError v-if="openedPopup === PopupType.Error" @close="closeSyncPopup" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { openedPopup, PopupType } from '../store/popup';
import { ErrorType, logout, pull, push, resetError, state } from '../store/sync';
import { tauriEmit, tauriListen } from '../utils';

import PopupSyncAuth from './PopupSyncAuth.vue';
import PopupSyncError from './PopupSyncError.vue';
import CloudErrorIcon from './svg/CloudErrorIcon.vue';
import CloudSyncIcon from './svg/CloudSyncIcon.vue';
import CloudTickIcon from './svg/CloudTickIcon.vue';

if (state.token) {
  tauriEmit('login');
  pull();
} else {
  tauriEmit('logout');
}

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

function handlePopupAuthEvent() {
  // Prevent bug where event.emit triggers event.listen
  if (!state.token) {
    openedPopup.value = PopupType.Auth;
  }
}

function closeSyncPopup() {
  openedPopup.value = undefined;
  resetError();
}

async function pushNotes() {
  if (!state.token) {
    handlePopupAuthEvent();
  } else {
    await push();
  }
}

tauriListen('push-notes', pushNotes);
tauriListen('login', () => {
  state.isLogin = true;
  handlePopupAuthEvent();
});
tauriListen('logout', logout);
tauriListen('signup', () => {
  state.isLogin = false;
  handlePopupAuthEvent();
});
</script>

<style lang="scss" scoped>
#sync-status {
  position: absolute;
  right: v.$utility-menu-right;
  bottom: 12px;

  > * {
    @include v.equal-dimensions(v.$utility-menu-width);
  }
}

.sync-status__loading-spinner {
  display: block;
  border: 5px solid var(--colour__interactive);
  border-bottom-color: var(--colour__secondary);
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
