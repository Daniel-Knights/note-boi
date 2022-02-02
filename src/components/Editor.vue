<template>
  <section id="editor">
    <h1
      class="editor__title"
      :class="{ 'editor__title--placeholder': comp.titlePlaceholder }"
      contenteditable="true"
      @input="editNote($event, 'title')"
      ref="noteTitle"
    >
      {{ state.selectedNote.title }}
    </h1>
    <small class="editor__date">{{
      unixToDateTime(state.selectedNote.timestamp || 0)
    }}</small>
    <pre
      class="editor__body"
      :class="{ 'editor__body--placeholder': comp.bodyPlaceholder }"
      contenteditable="true"
      @input="editNote($event, 'body')"
      ref="noteBody"
      >{{ state.selectedNote.body }}</pre
    >
  </section>
</template>

<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue';

import { state, editNote, findNote } from '../store';
import { unixToDateTime, isWhitespaceOnly, isEmptyNote } from '../utils';

const noteTitle = ref<HTMLElement | undefined>(undefined);
const noteBody = ref<HTMLElement | undefined>(undefined);

const comp = computed(() => {
  const foundNote = findNote(state.selectedNote.id);

  return {
    titlePlaceholder: isWhitespaceOnly(foundNote?.title),
    bodyPlaceholder: isWhitespaceOnly(foundNote?.body),
  };
});

// Cleanup previously typed content
watchEffect(() => {
  if (!isEmptyNote(state.selectedNote)) return;

  if (noteTitle.value) noteTitle.value.innerText = '';
  if (noteBody.value) noteBody.value.innerText = '';
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
