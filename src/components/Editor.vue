<template>
  <div id="editor">
    <h1 contenteditable="true">{{ state.selectedNote?.title }}</h1>
    <pre contenteditable="true">{{ state.selectedNote?.body }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { state } from '../store';
</script>

<style lang="scss" scoped>
#editor {
  height: 100%;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    display: none;
  }
}

h1,
pre {
  outline: none;
}

h1 {
  font-size: 2rem;
  font-weight: bold;
  padding: 1rem 0;
  border-bottom: 1px solid;
}

pre {
  margin-top: 1rem;
  height: 100%;
}
</style>
