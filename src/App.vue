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

html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  margin: 0;
  color: var(--color__secondary);
  background-color: var(--color__primary);
}

button {
  cursor: pointer;
  font-size: 30px;
  color: var(--color__secondary);
  background-color: #2e2e2e;

  &:hover {
    opacity: 0.8;
  }
}

#app {
  display: grid;
  grid-template-columns: minmax(250px, 25%) auto;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family: Verdana, Geneva, Tahoma, sans-serif;
}
</style>
