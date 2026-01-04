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
      @contextmenu.prevent="contextMenuEv = $event"
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
        <h2
          class="note-menu__title"
          :class="{ 'note-menu__title--empty': !note.content.title }"
        >
          {{ note.content.title }}
        </h2>
        <p
          class="note-menu__body"
          :class="{ 'note-menu__body--empty': !note.content.body }"
        >
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
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { Note, Storage } from '../classes';
import {
  findNote,
  findNoteIndex,
  isSelectedNote,
  newNote,
  noteState,
  selectNote,
} from '../store/note';
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

const contextMenuEv = ref<MouseEvent>();
const isDragging = ref(false);
const listIsFocused = ref(true);
const menuWidthDesktop = ref(Storage.get('MENU_WIDTH') || '260px');

const menuWidth = computed(() =>
  props.isSmallScreen ? '100vw' : menuWidthDesktop.value
);

// Clear all extra notes and remove event listener
function clearExtraNotes(ev?: MouseEvent) {
  if (ev) {
    if (ev.button !== 0) return; // Only clear on left click
    if (ev.metaKey || ev.ctrlKey) return;
  }

  noteState.extraSelectedNotes = [];

  document.removeEventListener('click', clearExtraNotes);
}

// New note handler
function handleNewNote() {
  newNote(true);

  if (props.isSmallScreen) {
    emit('update:showNoteMenu', false);
  }
}

// Single or multiple note selection handler
function handleNoteSelect(ev: MouseEvent) {
  if (props.isSmallScreen) {
    emit('update:showNoteMenu', false);
  }

  const target = ev.target as HTMLElement | null;
  const closestNote = target?.closest<HTMLElement>('.note-menu__note');
  const targetNoteUuid = closestNote?.dataset.noteUuid;
  if (!targetNoteUuid) return;

  const hasExtraNotes = noteState.extraSelectedNotes.length > 0;

  // Shift key + click
  if (ev.shiftKey) {
    const targetNoteIndex = findNoteIndex(targetNoteUuid);

    if (targetNoteIndex >= 0) {
      const lastSelectedNote = hasExtraNotes
        ? noteState.extraSelectedNotes[noteState.extraSelectedNotes.length - 1]?.uuid
        : noteState.selectedNote.uuid;
      const selectedNoteIndex = findNoteIndex(lastSelectedNote);

      if (selectedNoteIndex >= 0) {
        const lowestIndex = Math.min(selectedNoteIndex, targetNoteIndex);
        const highestIndex = Math.max(selectedNoteIndex, targetNoteIndex);

        let noteSlice: Note[] = [];

        if (lowestIndex === selectedNoteIndex) {
          noteSlice = noteState.notes.slice(lowestIndex + 1, highestIndex + 1);
        } else if (highestIndex === selectedNoteIndex) {
          // Reverse to ensure correct selection order, `0` = next in queue
          noteSlice = noteState.notes.slice(lowestIndex, highestIndex).reverse();
        }

        const withoutDuplicates = noteSlice.filter((nt) => !isSelectedNote(nt));

        noteState.extraSelectedNotes.push(...withoutDuplicates);

        ev.stopImmediatePropagation(); // Prevent `clearExtraNotes` firing immediately
        document.addEventListener('click', clearExtraNotes);
      }
    }

    return;
  }

  // Ctrl key + click
  if (ev.metaKey || ev.ctrlKey) {
    const alreadySelectedIndex = noteState.extraSelectedNotes.findIndex(
      (nt) => nt?.uuid === targetNoteUuid
    );

    // Deselect
    if (alreadySelectedIndex >= 0) {
      noteState.extraSelectedNotes.splice(alreadySelectedIndex, 1);

      if (noteState.selectedNote.uuid === targetNoteUuid) {
        selectNote(noteState.extraSelectedNotes[0]?.uuid);
      }

      // Select next extra note when current selected note is deselected
    } else if (noteState.selectedNote.uuid === targetNoteUuid && hasExtraNotes) {
      selectNote(noteState.extraSelectedNotes[0]?.uuid);

      noteState.extraSelectedNotes.splice(0, 1);

      // Add to selection
    } else if (noteState.selectedNote.uuid !== targetNoteUuid) {
      const foundNote = findNote(targetNoteUuid);

      if (foundNote) {
        noteState.extraSelectedNotes.push(foundNote);

        document.addEventListener('click', clearExtraNotes);
      }
    }

    return;
  }

  // Single click
  selectNote(targetNoteUuid);
}

// Drag bar functionality
function handleDragBar() {
  isDragging.value = true;

  function handleDragBarMouseMove(ev: MouseEvent) {
    if (!isDragging.value) return;

    if (ev.clientX < 150) {
      emit('update:showNoteMenu', false);

      return;
    }

    emit('update:showNoteMenu', true);
    menuWidthDesktop.value = `${ev.clientX}px`;
  }

  document.addEventListener('mousemove', handleDragBarMouseMove);

  document.addEventListener(
    'mouseup',
    () => {
      isDragging.value = false;

      Storage.set('MENU_WIDTH', menuWidthDesktop.value);
      document.removeEventListener('mousemove', handleDragBarMouseMove);
    },
    { once: true }
  );
}

// Navigate notes with up/down arrow keys
function navigateWithArrowKeys(ev: KeyboardEvent) {
  if (!listIsFocused.value) return;

  ev.preventDefault(); // Prevents noise on Mac

  const keyDirection = {
    ArrowUp: 1,
    ArrowDown: -1,
  };

  const directionIndex: number | undefined =
    keyDirection[ev.key as keyof typeof keyDirection];

  if (directionIndex) {
    const lastSelectedNoteUuid =
      noteState.extraSelectedNotes[0]?.uuid || noteState.selectedNote.uuid;
    // Index of the note we're selecting
    const toIndex = findNoteIndex(lastSelectedNoteUuid) - directionIndex;

    selectNote(noteState.notes[toIndex]?.uuid);
    clearExtraNotes();
  }
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

// Register list blur
window.addEventListener('click', (ev) => {
  if (!(ev.target as HTMLElement)?.closest('#note-menu')) {
    listIsFocused.value = false;
  }
});

window.addEventListener('keydown', navigateWithArrowKeys);

onUnmounted(() => {
  window.removeEventListener('keydown', navigateWithArrowKeys);
});
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
  z-index: 25;
}

.note-menu__note-list {
  height: 100%;
  padding-bottom: $new-note-height;
  overflow-y: scroll;

  &::-webkit-scrollbar {
    display: none;
  }
}

.note-menu__note:hover,
.note-menu__note--selected {
  text-shadow: v.$text-shadow;
}

.note-menu__note {
  cursor: pointer;
  position: relative;
  padding: 12px 15px;

  &:hover,
  &--selected {
    color: v.$white;
    background-color: var(--colour__tertiary);
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

.note-menu__title {
  &,
  &--empty + .note-menu__body {
    margin-top: 0;
    font-size: 18px;
    font-weight: 600;
  }
}

.note-menu__body {
  margin-top: 3px;
  font-size: 15px;

  &--empty {
    display: none;
  }
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
