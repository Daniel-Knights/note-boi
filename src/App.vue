<template>
  <Loading v-if="updateDownloading" />
  <NoteMenu />
  <Editor />
  <UtilityMenu />
  <SyncStatus />
</template>

<script lang="ts" setup>
import { updateDownloading } from './store/update';

import Editor from './components/Editor.vue';
import Loading from './components/Loading.vue';
import NoteMenu from './components/NoteMenu.vue';
import SyncStatus from './components/SyncStatus.vue';
import UtilityMenu from './components/UtilityMenu.vue';
</script>

<style lang="scss">
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

#app {
  display: flex;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu,
    Cantarell, 'Helvetica Neue', sans-serif;
}

a {
  color: rgb(47, 175, 122);

  &:hover {
    text-decoration: none;
    color: rgb(74, 196, 145);
  }
}
</style>
