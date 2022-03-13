<template>
  <div id="sync-status">
    <div
      v-if="state.isSyncing"
      class="sync-status__loading-spinner"
      title="Syncing changes"
    >
      Loading...
    </div>
    <button
      v-else-if="state.error !== ''"
      class="sync-status__sync-button"
      title="Sync error"
      @click="showErrorModal"
    >
      Error icon
    </button>
    <div v-else-if="state.token !== '' && !state.hasUnsyncedNotes" title="Changes synced">
      Cloud with tick
    </div>
    <button
      v-else
      class="sync-status__sync-button"
      title="Sync changes"
      @click="syncNotes"
    >
      <svg viewBox="0 0 28 22">
        <!-- eslint-disable max-len -->
        <path
          fill="currentColor"
          d="M23,8.29A9,9,0,0,0,5.37,6.45,8,8,0,0,0,8,22H21A7,7,0,0,0,23,8.29Zm-4.68,7.42-2-2a1,1,0,0,1-.21-1.09A1,1,0,0,1,17,12h.86A4,4,0,0,0,14,9a4,4,0,0,0-1.6.33,1,1,0,1,1-.8-1.83A5.93,5.93,0,0,1,14,7a6,6,0,0,1,5.91,5H21a1,1,0,0,1,.92.62,1,1,0,0,1-.21,1.09l-2,2a1,1,0,0,1-1.42,0Zm-12-3.42,2-2a1,1,0,0,1,1.42,0l2,2a1,1,0,0,1,.21,1.09A1,1,0,0,1,11,14h-.86a4,4,0,0,0,5.46,2.67,1,1,0,0,1,.8,1.83A6,6,0,0,1,8.09,14H7a1,1,0,0,1-.92-.62A1,1,0,0,1,6.29,12.29Z"
        />
        <!-- eslint-enable max-len -->
      </svg>
    </button>
  </div>
</template>

<script lang="ts" setup>
import { event } from '@tauri-apps/api';
import { pull, push, state } from '../store/sync';

if (state.token) pull();

async function syncNotes() {
  if (!state.token) {
    // Trigger login modal
  } else {
    await push();
  }
}

function showErrorModal() {
  //
}

event.listen('sync-notes', syncNotes);
</script>

<style lang="scss" scoped>
#sync-status {
  position: absolute;
  bottom: 12px;
  right: 24px;
  @include v.equal-dimensions(32px);

  > * {
    @include v.equal-dimensions(100%);
  }
}

.sync-status__sync-button {
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}
</style>
