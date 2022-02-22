<template>
  <section id="editor">
    <small class="editor__date">{{
      unixToDateTime(state.selectedNote.timestamp || 0)
    }}</small>
    <div class="editor__body"></div>
  </section>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import Quill from 'quill';

import { state, editBody } from '../store';
import { unixToDateTime } from '../utils';

let quillEditor: Quill | undefined;
let isNoteSelect = false;

document.addEventListener('note-new', () => {
  // Timeout prevents weird bug where cursor line ignores padding
  setTimeout(() => {
    quillEditor?.setSelection(0, 0);
  });
});
document.addEventListener('note-change', () => {
  const parsedBody = JSON.parse(state.selectedNote.content.delta || '[]');

  quillEditor?.setContents(parsedBody);
});
document.addEventListener('note-select', () => {
  isNoteSelect = true;

  quillEditor?.blur(); // Prevent focus bug after new note
});

onMounted(() => {
  quillEditor = new Quill('.editor__body', {
    modules: {
      toolbar: true,
    },
    placeholder: 'New note...',
    theme: 'snow',
  });

  quillEditor.on('text-change', () => {
    if (isNoteSelect) {
      isNoteSelect = false;
      return;
    }

    if (!quillEditor) return;
    const delta = quillEditor.getContents();
    const [title, body] = quillEditor.root.innerText.split(/\n+/);

    editBody(JSON.stringify(delta), title, body);
  });
});
</script>

<style lang="scss">
#editor {
  height: 100%;
  overflow-y: scroll;

  &,
  .ql-editor {
    &::-webkit-scrollbar {
      display: none;
    }
  }

  $text-padding: 8px;

  .editor__date,
  .ql-editor {
    padding-left: $text-padding;
    padding-right: $text-padding;
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

  .ql-editor.ql-blank::before {
    color: var(--color__tertiary);
    left: $text-padding;
  }

  .ql-toolbar,
  .ql-container {
    border: none;
  }

  .ql-tooltip {
    left: 50% !important;
    transform: translate(-50%, 50%);
    border: none;
  }
}
</style>
