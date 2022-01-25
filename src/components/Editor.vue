<template>
  <div id="editor">
    <h1>{{ state.selectedNote?.title }}</h1>
    <hr />
    <pre>{{ state.selectedNote?.body }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { state } from '../store';
</script>

<style lang="scss" scoped></style>
