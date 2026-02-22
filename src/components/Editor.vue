<template>
  <main id="editor">
    <header class="editor__header">
      <small class="editor__date" data-test-id="timestamp">{{
        unixToDateTime(noteState.selectedNote.timestamp || 0)
      }}</small>
    </header>
    <!-- Toolbar has to be defined manually like this, so scrolling works correctly -->
    <div class="editor__toolbar">
      <select class="ql-header">
        <option value="1"></option>
        <option value="2"></option>
        <option value="3"></option>
        <option selected></option>
      </select>
      <div class="ql-formats">
        <button class="ql-bold" title="Bold"></button>
        <button class="ql-italic" title="Italic"></button>
        <button class="ql-underline" title="Underline"></button>
        <button class="ql-strike" title="Strikethrough"></button>
        <button class="ql-code" title="Code"></button>
      </div>
      <div class="ql-formats">
        <button class="ql-list" value="ordered" title="Ordered list"></button>
        <button class="ql-list" value="bullet" title="Bullet list"></button>
        <button class="ql-indent" value="-1" title="Decrease indent"></button>
        <button class="ql-indent" value="+1" title="Increase indent"></button>
        <button class="ql-clean" title="Clear formatting"></button>
      </div>
    </div>
    <div class="editor__scroll-container">
      <div class="editor__body" ref="editor-body" data-test-id="body"></div>
    </div>
    <!-- ENH: Enable on touch devices -->
    <FindInPage
      v-if="quillEditorInitialised && editorBody && openFindInPage && !isTouchDevice"
      :text="editorText"
      :root-el="editorBody!"
      :get-bounds-at-index="(i, len) => quillEditor!.getBounds(i, len)"
      @close="openFindInPage = false"
    />
  </main>
</template>

<script lang="ts" setup>
import Quill from 'quill';
import { onMounted, ref, useTemplateRef } from 'vue';

import { Note } from '../classes';
import { addNoteEventListener, editNote, noteState } from '../store/note';
import { unixToDateTime } from '../utils';

import FindInPage from './FindInPage.vue';

defineProps<{ isTouchDevice: boolean }>();

const editorBody = useTemplateRef('editor-body');

const openFindInPage = ref(false);
const quillEditorInitialised = ref(false);
const editorText = ref('');

// NOTE: We can't use `ref` for `quillEditor`, because it breaks something
// to do with how Quill works internally
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
  openFindInPage.value = false;
  quillEditor?.blur(); // Prevent focus bug after new note
}

onMounted(() => {
  quillEditor = new Quill(editorBody.value!, {
    modules: {
      toolbar: '.editor__toolbar',
    },
    placeholder: 'New note...',
    theme: 'snow',
  });

  quillEditor.on('text-change', (newDelta, oldDelta) => {
    editorText.value = quillEditor!.getText();

    if (ignoreTextChange) {
      ignoreTextChange = false;

      return;
    }

    const { title, body } = Note.parseTitleAndBody(editorText.value);

    editNote(oldDelta.compose(newDelta), title, body);
  });

  quillEditorInitialised.value = true;
});

// Event listeners
addNoteEventListener('note-new', newNoteEventHandler);
addNoteEventListener('note-select', selectNoteEventHandler);
addNoteEventListener('note-change', changeNoteEventHandler);

// Open/close find in page
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'f' && (ev.metaKey || ev.ctrlKey)) {
    openFindInPage.value = true;
  } else if (ev.key === 'Escape') {
    openFindInPage.value = false;
  }
});
</script>

<!-- Can't be scoped, affects Quill styles -->
<style lang="scss">
@use '../sass/vars' as v;

$spacing-x: 12px;
$text-indent: 1em;
$toolbar-height: 40px;
$utility-button-padding: (v.$utility-button-spacing-x - $spacing-x) * 2;

#editor {
  position: relative;
  height: 100%;
  overflow: hidden;

  .editor__header {
    @include v.flex-y(center, center);
    height: v.$editor-header-height;
    border-bottom: 1px solid var(--colour__tertiary);
  }

  .editor__date {
    user-select: none;
    -webkit-user-select: none;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: var(--colour__tertiary-light);
  }

  .editor__scroll-container {
    position: relative;
    height: calc(100% - v.$editor-header-height - $toolbar-height);
    overflow: auto;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .ql-editor {
    display: inline-block; // Fixes Safari Webview bug where caret duplicates on new line with text-indent set
    position: relative;
    margin: 12px $spacing-x 0;
    padding: 0 0 v.$find-in-page-height $text-indent;
    height: fit-content;
    width: calc(100% - #{$spacing-x * 2});
    text-indent: -$text-indent;
    z-index: 5;

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
      left: $spacing-x + 3px;
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
    position: relative;
    z-index: 10;

    // Heading dropdown
    .ql-header {
      margin-right: 16px;

      * {
        border: none;
      }

      .ql-picker-label {
        line-height: 24px;
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
    @mixin button-color($colour) {
      color: $colour;

      .ql-stroke,
      .ql-thin {
        stroke: $colour;
      }

      .ql-fill {
        fill: $colour;
      }
    }

    button {
      @include button-color(var(--colour__tertiary));
    }

    // Ensure hover styles aren't applied on touch devices
    @media (hover: hover) {
      button:hover {
        @include button-color(var(--colour__highlight-hover));
      }
    }

    .ql-active {
      @include button-color(var(--colour__highlight));
    }

    // Increase button sizes on small screens
    @media (max-width: v.$small-screen-width) {
      $button-size: 30px;

      .ql-header {
        height: $button-size;
        font-size: 16px;

        .ql-picker-label::before {
          line-height: $button-size;
        }
      }

      button {
        @include v.equal-dimensions($button-size);
      }

      .ql-formats {
        margin-right: 8px;
      }
    }
  }
}
</style>
