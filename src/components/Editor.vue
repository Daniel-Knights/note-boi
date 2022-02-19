<template>
  <section id="editor">
    <small class="editor__date">{{
      unixToDateTime(state.selectedNote.timestamp || 0)
    }}</small>
    <div class="editor__body"></div>
  </section>
</template>

<script lang="ts" setup>
import { onMounted, ref, watchEffect } from 'vue';
import Quill from 'quill';

import { state, editBody } from '../store';
import { unixToDateTime, isEmptyNote } from '../utils';

const noteTitle = ref<HTMLElement | undefined>(undefined);

let quillEditor: Quill | undefined;
let isNoteSelect = false;

// Cleanup previously typed content
watchEffect(() => {
  if (!isEmptyNote(state.selectedNote)) return;

  if (noteTitle.value) noteTitle.value.innerText = '';
});

document.addEventListener('note-change', () => {
  const parsedBody = JSON.parse(state.selectedNote.body.delta || '[]');

  quillEditor?.setContents(parsedBody);
});

document.addEventListener('note-select', () => {
  isNoteSelect = true;
});

onMounted(() => {
  quillEditor = new Quill('.editor__body', {
    modules: {
      toolbar: true,
    },
    placeholder: 'Body',
    theme: 'snow',
  });

  quillEditor.on('text-change', () => {
    if (isNoteSelect) {
      isNoteSelect = false;
      return;
    }

    if (!quillEditor) return;
    const delta = quillEditor.getContents();
    const text = quillEditor.root.innerText;

    editBody(JSON.stringify(delta), text);
  });
});
</script>

<style lang="scss">
#editor {
  height: 100%;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    display: none;
  }

  .editor__date,
  .ql-editor {
    padding-left: 8px;
    padding-right: 8px;
  }

  .editor__date {
    display: block;
    padding-top: 10px;
    padding-bottom: 10px;
    text-align: center;
    font-size: 11px;
    color: var(--color__tertiary);
    border-bottom: 1px solid var(--color__tertiary);
  }

  .ql-toolbar,
  .ql-container {
    border: none;
  }
}
</style>
