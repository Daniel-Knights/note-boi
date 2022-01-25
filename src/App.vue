<template>
  <Menu />
  <Editor />
</template>

<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { getAllNotes } from './store';

import Menu from './components/Menu.vue';
import Editor from './components/Editor.vue';

onBeforeMount(() => {
  getAllNotes();
});
</script>

<style lang="scss">
@use './sass/reset';

body {
  margin: 0;
  color: var(--color__secondary);
  background-color: var(--color__primary);
}

#app {
  display: grid;
  grid-template-columns: 20% 80%;
  width: 100vw;
  margin: 0;
}
</style>
