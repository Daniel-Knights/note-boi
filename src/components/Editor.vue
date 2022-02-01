<template>
  <section id="editor">
    <h1
      class="editor__title"
      :class="comp.titlePlaceholder"
      contenteditable="true"
      @input="editNote($event, 'title')"
    >
      {{ comp.selectedNote?.title }}
    </h1>
    <small class="editor__date">{{
      unixToDateTime(comp.selectedNote?.timestamp || 0)
    }}</small>
    <pre
      class="editor__body"
      :class="comp.bodyPlaceholder"
      contenteditable="true"
      @input="editNote($event, 'body')"
      >{{ comp.selectedNote?.body }}</pre
    >
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { state, findNote, editNote } from '../store';
import { unixToDateTime, isWhitespaceOnly } from '../utils';

const comp = computed(() => {
  const note = findNote(state.selectedId);

  return {
    titlePlaceholder: {
      'editor__title--placeholder': isWhitespaceOnly(note?.title),
    },
    bodyPlaceholder: {
      'editor__body--placeholder': isWhitespaceOnly(note?.body),
    },
    selectedNote: note,
  };
});
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

  &--placeholder {
    color: rgba(136, 136, 136, 0.6);

    &::before {
      position: absolute;
    }
  }
}

.editor__title {
  font-size: 32px;
  font-weight: bold;
  padding-top: 8px;

  &--placeholder::before {
    content: 'Title';
  }
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

  &--placeholder::before {
    content: 'Body';
  }
}
</style>
