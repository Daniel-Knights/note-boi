<template>
  <section id="editor">
    <small class="editor__date" data-test-id="timestamp">{{
      unixToDateTime(state.selectedNote.timestamp || 0)
    }}</small>
    <div class="editor__body" ref="editorBody"></div>
  </section>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import Quill from 'quill';
import punycode from 'punycode/';

import { unixToDateTime } from '../utils';
import { NOTE_EVENTS } from '../constant';
import { state, editNote } from '../store/note';

const editorBody = ref<HTMLDivElement | null>(null);

let quillEditor: Quill | undefined;
let isNoteSelect = false;

document.addEventListener(NOTE_EVENTS.new, () => {
  // Timeout prevents weird bug where cursor line ignores padding
  setTimeout(() => {
    quillEditor?.setSelection(0, 0);
  });
});
document.addEventListener(NOTE_EVENTS.change, () => {
  const parsedNoteContent = JSON.parse(
    punycode.decode(state.selectedNote.content.delta) || '[]'
  );

  quillEditor?.setContents(parsedNoteContent);
});
document.addEventListener(NOTE_EVENTS.select, () => {
  isNoteSelect = true;

  quillEditor?.blur(); // Prevent focus bug after new note
});

onMounted(() => {
  quillEditor = new Quill(editorBody.value!, {
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
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
    const [title, body] = quillEditor.getText().split(/\n+/);

    editNote(punycode.encode(JSON.stringify(delta)), title, body);
  });
});
</script>

<!-- Can't be scoped, affects Quill styles -->
<style lang="scss">
#editor {
  flex-grow: 1;
  height: 100%;
  overflow-y: scroll;

  &,
  .ql-editor {
    &::-webkit-scrollbar {
      display: none;
    }
  }

  $text-padding: 8px;

  .editor__date {
    user-select: none;
    -webkit-user-select: none;
    display: block;
    padding: 10px $text-padding;
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: var(--colour__tertiary);
    border-bottom: 1px solid var(--colour__interactive);
  }

  .ql-editor {
    padding-left: $text-padding;
    padding-right: 60px;
  }

  .ql-editor.ql-blank::before {
    color: var(--colour__tertiary);
    left: $text-padding;
  }

  .ql-toolbar,
  .ql-container {
    font-family: inherit;
    border: none;
  }

  .ql-tooltip {
    left: 50% !important;
    transform: translate(-50%, 50%);
    border: none;
  }
}
</style>
