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
import type Delta from 'quill-delta';

import { unixToDateTime } from '../utils';
import { NOTE_EVENTS } from '../constant';
import { state, editNote } from '../store/note';

const editorBody = ref<HTMLDivElement | null>(null);

let quillEditor: Quill | undefined;
let ignoreTextChange = false;

document.addEventListener(NOTE_EVENTS.new, () => {
  // Timeout to wait for note to be created/selected
  setTimeout(() => {
    quillEditor?.setSelection(0, 0);
    quillEditor?.root.click(); // Needed for MacOS
  });
});
document.addEventListener(NOTE_EVENTS.change, () => {
  ignoreTextChange = true;

  // @ts-expect-error TS won't accept the Delta type here
  quillEditor?.setContents(state.selectedNote.content.delta);
});
document.addEventListener(NOTE_EVENTS.select, () => {
  ignoreTextChange = true;

  quillEditor?.blur(); // Prevent focus bug after new note
});

onMounted(() => {
  quillEditor = new Quill(editorBody.value!, {
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, 'link', 'code-block'],
        ['clean'],
      ],
    },
    placeholder: 'New note...',
    theme: 'snow',
  });

  quillEditor.on('text-change', () => {
    if (ignoreTextChange) {
      ignoreTextChange = false;
      return;
    }

    if (!quillEditor) return;
    const delta = quillEditor.getContents();
    const [title, body] = quillEditor.getText().split(/\n+/);

    editNote(delta as Delta, title, body);
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

  $spacing-x: 8px;

  .editor__date {
    user-select: none;
    -webkit-user-select: none;
    @include v.flex-x(center, center);
    height: v.$editor-date-height;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: var(--colour__tertiary);
    border-bottom: 1px solid var(--colour__interactive);
  }

  .ql-editor {
    margin: 12px $spacing-x 0;
    $utility-menu-padding: (v.$utility-menu-right - $spacing-x) * 2;
    $padding-right: v.$utility-menu-width + $utility-menu-padding;
    padding: 0 $padding-right 12px 0;
  }

  .ql-editor.ql-blank::before {
    color: var(--colour__tertiary);
    left: $spacing-x;
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
