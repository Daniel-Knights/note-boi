<template>
  <section id="editor">
    <h1 class="editor__title" contenteditable="true" @input="editNote($event, 'title')">
      {{ state.selectedNote.title }}
    </h1>
    <small class="editor__date">{{ formatDateTime(state.selectedNote.timestamp) }}</small>
    <pre class="editor__body" contenteditable="true" @input="editNote($event, 'body')">{{
      state.selectedNote.body
    }}</pre>
  </section>
</template>

<script lang="ts" setup>
import { state, editNote } from '../store';
import { formatDateTime } from '../utils';
</script>

<style lang="scss" scoped>
#editor {
  height: 100%;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    display: none;
  }
}

.editor__title,
.editor__body,
.editor__date {
  padding-left: 8px;
  padding-right: 8px;
}

.editor__title,
.editor__body {
  outline: none;
}

.editor__title {
  font-size: 32px;
  font-weight: bold;
  padding-top: 8px;
}

.editor__date {
  display: block;
  padding-top: 10px;
  padding-bottom: 16px;
  font-size: 11px;
  border-bottom: 1px solid;
}

.editor__body {
  padding-top: 16px;
  height: 100%;
  white-space: pre-wrap;
}
</style>
