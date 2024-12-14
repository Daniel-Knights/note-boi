<template>
  <section id="editor">
    <small class="editor__date" data-test-id="timestamp">{{
      unixToDateTime(noteState.selectedNote.timestamp || 0)
    }}</small>
    <div class="editor__body" ref="editorBody" data-test-id="body"></div>
  </section>
</template>

<script lang="ts" setup>
import Quill from 'quill';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { NOTE_EVENTS } from '../constant';
import { editNote, noteState } from '../store/note';
import { unixToDateTime } from '../utils';

const editorBody = ref<HTMLDivElement>();

let quillEditor: Quill | undefined;
let ignoreTextChange = false;

function newNoteEventHandler() {
  // Timeout to wait for note to be created/selected
  setTimeout(() => {
    quillEditor?.setSelection(0, 0);
    quillEditor?.root.click(); // Needed for MacOS
  });
}
function changeNoteEventHandler() {
  ignoreTextChange = true;

  // @ts-expect-error - TS won't accept the Delta type here
  quillEditor?.setContents(noteState.selectedNote.content.delta);
}
function selectNoteEventHandler() {
  ignoreTextChange = true;

  quillEditor?.blur(); // Prevent focus bug after new note
}

onMounted(() => {
  quillEditor = new Quill(editorBody.value!, {
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, 'code'],
        [{ indent: '-1' }, { indent: '+1' }],
        ['clean'],
      ],
    },
    placeholder: 'New note...',
    theme: 'snow',
  });

  quillEditor.on('text-change', (delta, oldDelta) => {
    if (ignoreTextChange) {
      ignoreTextChange = false;

      return;
    }

    if (!quillEditor) return;

    const [title, body] = quillEditor.getText().split(/\n+/);

    editNote(oldDelta.compose(delta), title!, body);
  });
});

// Event listeners
document.addEventListener(NOTE_EVENTS.new, newNoteEventHandler);
document.addEventListener(NOTE_EVENTS.change, changeNoteEventHandler);
document.addEventListener(NOTE_EVENTS.select, selectNoteEventHandler);

onBeforeUnmount(() => {
  document.removeEventListener(NOTE_EVENTS.new, newNoteEventHandler);
  document.removeEventListener(NOTE_EVENTS.change, changeNoteEventHandler);
  document.removeEventListener(NOTE_EVENTS.select, selectNoteEventHandler);
});
</script>

<!-- Can't be scoped, affects Quill styles -->
<style lang="scss">
@use '../sass/vars' as v;

$spacing-x: 12px;
$text-indent: 1em;
$toolbar-height: 40px;
$utility-menu-padding: (v.$utility-menu-right - $spacing-x) * 2;
$padding-right: v.$utility-menu-width + $utility-menu-padding;

#editor {
  flex-grow: 1;
  height: 100%;
  overflow: hidden;

  .editor__body {
    position: relative;
    height: calc(100% - #{v.$editor-date-height + $toolbar-height});
    overflow: hidden;
  }

  .editor__date {
    user-select: none;
    -webkit-user-select: none;
    @include v.flex-x(center, center);
    height: v.$editor-date-height;
    width: 100%;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: var(--colour__tertiary-light);
    border-bottom: 1px solid var(--colour__tertiary);
  }

  .ql-editor {
    display: inline-block; // Fixes Safari Webview bug where caret duplicates on new line with text-indent set
    margin: 12px $spacing-x 0;
    padding: 0 $padding-right 12px $text-indent;
    width: calc(100% - #{$spacing-x * 2});
    text-indent: -$text-indent;
    overflow: scroll;

    &::-webkit-scrollbar {
      display: none;
    }

    .ql-code-block-container {
      padding: 5px 20px;
    }

    code {
      color: var(--colour__white);
      background-color: var(--colour__tertiary);
    }

    // Placeholder
    &.ql-blank::before {
      color: var(--colour__tertiary);
      left: calc(#{$spacing-x} + #{$text-indent});
    }

    // List numbers and bullets
    .ql-ui::before {
      color: var(--colour__highlight);
    }
  }

  .ql-toolbar,
  .ql-container {
    font-family: inherit;
    border: none;
  }

  .ql-toolbar {
    padding-right: $padding-right;

    // Heading dropdown
    .ql-picker {
      * {
        border: none;
      }

      .ql-picker-label {
        color: var(--colour__tertiary);

        .ql-stroke {
          stroke: var(--colour__tertiary);
        }

        &:hover {
          color: var(--colour__highlight-hover);

          .ql-stroke {
            stroke: var(--colour__highlight-hover);
          }
        }
      }

      .ql-picker-options {
        color: var(--colour__white);
        background-color: var(--colour__tertiary);

        // Weird bug where selected text size is briefly blue in dropdown
        .ql-selected {
          color: inherit;
        }

        .ql-picker-item:hover {
          color: var(--colour__highlight-hover);
        }
      }
    }

    // Toolbar buttons
    $button-states: (
      'button': var(--colour__tertiary),
      'button:hover': var(--colour__highlight-hover),
      '.ql-active': var(--colour__highlight),
    );

    @each $selector, $colour in $button-states {
      #{$selector} {
        color: $colour;

        .ql-stroke,
        .ql-thin {
          stroke: $colour;
        }

        .ql-fill {
          fill: $colour;
        }
      }
    }
  }
}
</style>
