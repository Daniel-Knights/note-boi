<template>
  <div id="editor">
    <h1 class="editor__title" contenteditable="true">{{ state.selectedNote?.title }}</h1>
    <div class="editor__dates">
      <small>Created: {{ state.selectedNote?.created_at }}</small>
      <small>Updated: {{ state.selectedNote?.updated_at }}</small>
    </div>
    <pre class="editor__body" contenteditable="true">{{ state.selectedNote?.body }}</pre>
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

.editor__title,
.editor__body,
.editor__dates {
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

.editor__dates {
  padding-top: 16px;
  padding-bottom: 16px;
  font-size: 11px;
  border-bottom: 1px solid;

  small {
    display: block;

    + small {
      margin-top: 5px;
    }
  }
}

.editor__body {
  padding-top: 16px;
  height: 100%;
}
</style>