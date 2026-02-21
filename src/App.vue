<template>
  <Loading v-if="updateState.isDownloading" />
  <NoteMenu v-model:show-note-menu="showNoteMenu" :is-small-screen="isSmallScreen" />
  <div class="layout-main">
    <NoteMenuToggle @click="showNoteMenu = !showNoteMenu" />
    <Editor :is-touch-device="isTouchDevice" />
    <Settings />
    <SyncStatus />
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue';

import { noteState } from './store/note';
import { updateState } from './store/update';

import Editor from './components/Editor.vue';
import Loading from './components/Loading.vue';
import NoteMenu from './components/NoteMenu.vue';
import NoteMenuToggle from './components/NoteMenuToggle.vue';
import Settings from './components/Settings.vue';
import SyncStatus from './components/SyncStatus.vue';

const smallScreenMediaQuery = window.matchMedia('(max-width: 650px)');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

const isSmallScreen = ref(smallScreenMediaQuery.matches);
const showNoteMenu = ref(!isSmallScreen.value); // Show menu by default on large screens

/**
 * Updates `isSmallScreen` and toggles note menu on media query match changes.
 */
function handleMediaChange(ev: MediaQueryListEvent) {
  isSmallScreen.value = ev.matches;
  showNoteMenu.value = !isSmallScreen.value || noteState.notes.length > 1;
}

smallScreenMediaQuery.addEventListener('change', handleMediaChange);

onBeforeUnmount(() => {
  smallScreenMediaQuery.removeEventListener('change', handleMediaChange);
});
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

.layout-main {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}

@media (pointer: coarse) {
  input,
  textarea,
  select,
  [contenteditable='true'] {
    font-size: 16px; // Prevent iOS zoom on focus
  }
}
</style>
