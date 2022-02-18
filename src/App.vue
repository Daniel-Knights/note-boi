<template>
  <Menu />
  <Editor />
</template>

<script setup lang="ts">
import { getAllNotes } from './store';

import Menu from './components/Menu.vue';
import Editor from './components/Editor.vue';

getAllNotes();
</script>

<style lang="scss">
@use 'quill/dist/quill.snow.css';

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

  &:hover {
    opacity: 0.8;
  }
}

a,
.ql-snow .ql-editor a {
  color: #06c;
}

#app {
  display: grid;
  grid-template-columns: minmax(260px, 25%) auto;
  margin: 0;
  @include v.equal-dimensions(100%);
  font-family: Verdana, Geneva, Tahoma, sans-serif;
}
</style>
