<template>
  <nav
    @click="listIsFocused = true"
    class="note-menu"
    :class="{
      'note-menu--small-screen': isSmallScreen,
    }"
    :style="{
      width: menuWidth,
      marginLeft: !showNoteMenu ? `-${menuWidth}` : '',
    }"
  >
    <ul
      @click="handleNoteSelect"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @contextmenu.prevent="handleContextMenu"
      class="note-menu__note-list"
      ref="note-list"
      data-test-id="note-list"
    >
      <li
        v-for="note in noteState.notes"
        :key="note.uuid"
        class="note-menu__note"
        :class="{
          'note-menu__note--selected': isSelectedNote(note),
          'note-menu__note--empty': isEmptyNote(note),
        }"
        :data-note-uuid="note.uuid"
      >
        <h2 v-if="note.content.title" class="note-menu__title">
          {{ note.content.title }}
        </h2>
        <p v-if="note.content.body" class="note-menu__body">
          {{ note.content.body }}
        </p>
      </li>
    </ul>
    <ContextMenu :ev="contextMenuEv" :handle-new-note="handleNewNote" />
    <button
      @click="handleNewNote"
      class="note-menu__new-note button button--default"
      data-test-id="new"
    >
      +
    </button>
    <div
      @mousedown="handleDragBar"
      class="note-menu__drag-bar"
      data-test-id="drag-bar"
    ></div>
  </nav>
</template>

<script lang="ts" setup>
import { useTemplateRef, watch } from 'vue';

import { useContextMenu } from '../composables/useContextMenu';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import { useMenuResize } from '../composables/useMenuResize';
import { useNoteSelection } from '../composables/useNoteSelection';
import { isSelectedNote, newNote, noteState } from '../store/note';
import { isEmptyNote } from '../utils';

import ContextMenu from './ContextMenu.vue';

const props = defineProps<{
  isSmallScreen: boolean;
  showNoteMenu: boolean;
}>();

const emit = defineEmits<{
  'update:showNoteMenu': [value: boolean];
}>();

const noteList = useTemplateRef('note-list');

// Use composables
const { clearExtraNotes, handleNoteSelect: handleNoteSelectionBase } = useNoteSelection();
const {
  contextMenuEv,
  // Imported for testing
  longPressTimer, // eslint-disable-line @typescript-eslint/no-unused-vars
  handleContextMenu,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
} = useContextMenu();
const {
  // Imported for testing
  isDragging, // eslint-disable-line @typescript-eslint/no-unused-vars
  menuWidth,
  // Imported for testing
  menuWidthDesktop, // eslint-disable-line @typescript-eslint/no-unused-vars
  handleDragBar,
} = useMenuResize(() => props.isSmallScreen, emit);
const { listIsFocused } = useKeyboardNavigation(clearExtraNotes);

// New note handler
function handleNewNote() {
  newNote(true);

  if (props.isSmallScreen) {
    emit('update:showNoteMenu', false);
  }
}

// Wrap handleNoteSelect to include small screen logic
function handleNoteSelect(ev: MouseEvent) {
  if (props.isSmallScreen) {
    emit('update:showNoteMenu', false);
  }

  handleNoteSelectionBase(ev);
}

// Ensure selected note is scrolled into view
watch(
  [() => noteState.selectedNote],
  () => {
    // Selected note edited instead of different note selected
    if (noteState.selectedNote.uuid === noteState.notes[0]?.uuid) {
      // `scrollTo` is undefined in tests
      noteList.value?.scrollTo?.({ top: 0 });

      return;
    }

    const selectedNoteEl = noteList.value?.querySelector(
      `[data-note-uuid="${noteState.selectedNote.uuid}"]`
    );

    // `scrollIntoView` is undefined in tests
    selectedNoteEl?.scrollIntoView?.({ block: 'center' });
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
@use 'sass:math';

@use '../sass/vars' as v;

$new-note-height: 50px;

.note-menu {
  flex-shrink: 0;
  position: relative;
  max-height: 100vh;
  max-width: 50vw;
  background-color: var(--colour__primary);
  z-index: 60;
}

.note-menu__note-list {
  overflow-y: scroll;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  padding-bottom: $new-note-height;
  height: 100%;

  &::-webkit-scrollbar {
    display: none;
  }
}

.note-menu__note {
  cursor: pointer;
  position: relative;
  padding: 12px 15px;

  @mixin note-highlight {
    color: v.$white;
    background-color: var(--colour__tertiary);
    text-shadow: v.$text-shadow;
  }

  &--selected {
    @include note-highlight;
  }

  @media (hover: hover) {
    &:hover {
      @include note-highlight;
    }
  }

  &--empty::before {
    content: 'New note';
  }
}

.note-menu__title,
.note-menu__body {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.note-menu__title,
.note-menu__note:not(:has(.note-menu__title)) .note-menu__body {
  margin-top: 0;
  font-size: 18px;
  font-weight: 600;
}

.note-menu__body {
  margin-top: 3px;
  font-size: 15px;
}

.note-menu__new-note {
  user-select: none;
  -webkit-user-select: none;
  position: absolute;
  top: calc(100% - $new-note-height);
  padding-bottom: 10px;
  height: $new-note-height;
  width: 100%;
  font-size: 32px;
  font-family: serif;
}

.note-menu__drag-bar {
  $width: 20px;

  cursor: w-resize;
  position: absolute;
  top: 0;
  // + 2 to account for line
  right: ($width * -0.5) + 2;
  height: 100%;
  width: $width;

  &::before {
    content: '';
    pointer-events: none;
    position: absolute;
    top: 0;
    left: math.div($width, 2);
    height: 100%;
    width: 1px;
    border: 1px solid var(--colour__tertiary);
  }
}

//// Small screen

.note-menu--small-screen {
  max-width: 100vw;

  .note-menu__drag-bar {
    display: none;
  }
}
</style>
