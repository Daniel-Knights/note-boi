<template>
  <Loading v-if="updateState.isDownloading" />
  <NoteMenu />
  <Editor />
  <UtilityMenu />
  <SyncStatus />
</template>

<script lang="ts" setup>
import { updateState } from './store/update';

import Editor from './components/Editor.vue';
import Loading from './components/Loading.vue';
import NoteMenu from './components/NoteMenu.vue';
import SyncStatus from './components/SyncStatus.vue';
import UtilityMenu from './components/UtilityMenu.vue';
</script>

<style lang="scss">
@use './sass/vars' as v;

html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  margin: 0;
  color: var(--colour__secondary);
  background-color: var(--colour__primary);
}

.dragging-file::before {
  content: '+';
  cursor: copy;
  @include v.flex-x(center, center);
  position: fixed;
  inset: 0;
  font-size: 200px;
  line-height: 0;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 10000;
}

#app {
  display: flex;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
    'Helvetica Neue', sans-serif;
}

a {
  color: var(--colour__highlight);

  &:hover {
    text-decoration: none;
    color: var(--colour__highlight-hover);
  }
}
</style>
