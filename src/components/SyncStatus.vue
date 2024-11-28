<template>
  <div id="sync-status">
    <!-- Loading -->
    <div
      v-if="syncState.isLoading"
      class="sync-status__loading-spinner"
      data-test-id="loading"
    ></div>
    <!-- Error -->
    <button
      v-else-if="syncState.appError.display?.sync"
      @click="openedPopup = PopupType.Error"
      class="sync-status__error button"
      title="Sync error"
      data-test-id="error"
    >
      <CloudErrorIcon />
    </button>
    <!-- Sync successful -->
    <div
      v-else-if="syncState.isLoggedIn && syncState.unsyncedNoteIds.size === 0"
      title="Changes synced"
      data-test-id="success"
    >
      <CloudTickIcon />
    </div>
    <!-- Sync ready -->
    <button
      v-else
      @click="handlePopupAuthEvent"
      class="sync-status__sync-button button"
      title="Sync changes"
      data-test-id="sync-button"
    >
      <CloudSyncIcon />
    </button>
  </div>
  <PopupSyncAuth v-if="openedPopup === PopupType.Auth" @close="closeSyncPopup(true)" />
  <PopupSyncError v-if="openedPopup === PopupType.Error" @close="closeSyncPopup" />
</template>

<script lang="ts" setup>
import { openedPopup, PopupType } from '../store/popup';
import { logout, resetAppError, syncState } from '../store/sync';
import { tauriListen } from '../utils';

import PopupSyncAuth from './PopupSyncAuth.vue';
import PopupSyncError from './PopupSyncError.vue';
import CloudErrorIcon from './svg/CloudErrorIcon.vue';
import CloudSyncIcon from './svg/CloudSyncIcon.vue';
import CloudTickIcon from './svg/CloudTickIcon.vue';

function handlePopupAuthEvent() {
  // Prevent bug where event.emit triggers event.listen
  if (!syncState.isLoggedIn) {
    openedPopup.value = PopupType.Auth;
  }
}

function closeSyncPopup(reset?: boolean) {
  openedPopup.value = undefined;

  if (reset) {
    resetAppError();
  }
}

tauriListen('login', () => {
  syncState.isLogin = true;
  handlePopupAuthEvent();
});
tauriListen('logout', logout);
tauriListen('signup', () => {
  syncState.isLogin = false;
  handlePopupAuthEvent();
});
</script>

<style lang="scss" scoped>
@use '../sass/vars' as v;

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
