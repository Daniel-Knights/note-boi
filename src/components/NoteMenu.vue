<template>
  <section @click="listIsFocused = true" id="note-menu" :style="{ width: menuWidth }">
    <ul
      @click="handleNoteSelect"
      @contextmenu.prevent="contextMenuEv = $event"
      class="note-menu__note-list"
      ref="noteList"
      data-test-id="note-list"
    >
      <li
        v-for="note in state.notes"
        :key="note.id"
        class="note-menu__note"
        :class="{
          'note-menu__note--selected': isSelectedNote(note),
          'note-menu__note--empty': isEmptyNote(note),
        }"
        :data-note-id="note.id"
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
    <ContextMenu :ev="contextMenuEv" />
    <button
      @click="newNote(true)"
      class="note-menu__new-note button--default"
      data-test-id="new"
    >
      +
    </button>
    <div
      @mousedown="handleDragBar"
      class="note-menu__drag-bar"
      data-test-id="drag-bar"
    ></div>
  </section>
</template>

<script lang="ts" setup>
import { onUnmounted, ref, watchEffect } from 'vue';

import { STORAGE_KEYS } from '../constant';
import {
  findNote,
  findNoteIndex,
  isSelectedNote,
  newNote,
  Note,
  selectNote,
  state,
} from '../store/note';
import { isEmptyNote } from '../utils';

import ContextMenu from './ContextMenu.vue';

const noteList = ref<HTMLElement>();
const contextMenuEv = ref<MouseEvent>();
const isDragging = ref(false);
const listIsFocused = ref(true);
const menuWidth = ref(localStorage.getItem(STORAGE_KEYS.MENU_WIDTH) || '260px');

// Clear all extra notes and remove event listener
function clearExtraNotes(ev?: MouseEvent) {
  if (ev) {
    if (ev.button !== 0) return; // Only clear on left click
    if (ev.metaKey || ev.ctrlKey) return;
  }

  state.extraSelectedNotes = [];

  document.removeEventListener('click', clearExtraNotes);
}

// Single or multiple note selection handler
function handleNoteSelect(ev: MouseEvent) {
  const target = ev.target as HTMLElement | null;
  const closestNote = target?.closest<HTMLElement>('.note-menu__note');
  const targetNoteId = closestNote?.dataset.noteId;
  if (!targetNoteId) return;

  const hasExtraNotes = state.extraSelectedNotes.length > 0;

  // Alt key + click
  if (ev.altKey) {
    const targetNoteIndex = findNoteIndex(targetNoteId);

    if (targetNoteIndex >= 0) {
      const lastSelectedNote = hasExtraNotes
        ? state.extraSelectedNotes[state.extraSelectedNotes.length - 1]?.id
        : state.selectedNote.id;
      const selectedNoteIndex = findNoteIndex(lastSelectedNote);

      if (selectedNoteIndex >= 0) {
        const lowestIndex = Math.min(selectedNoteIndex, targetNoteIndex);
        const highestIndex = Math.max(selectedNoteIndex, targetNoteIndex);

        let noteSlice: Note[] = [];

        if (lowestIndex === selectedNoteIndex) {
          noteSlice = state.notes.slice(lowestIndex + 1, highestIndex + 1);
        } else if (highestIndex === selectedNoteIndex) {
          // Reverse to ensure correct selection order, `0` = next in queue
          noteSlice = state.notes.slice(lowestIndex, highestIndex).reverse();
        }

        const withoutDuplicates = noteSlice.filter((nt) => !isSelectedNote(nt));

        state.extraSelectedNotes.push(...withoutDuplicates);

        ev.stopImmediatePropagation(); // Prevent `clearExtraNotes` firing immediately
        document.addEventListener('click', clearExtraNotes);
      }
    }

    return;
  }

  // Ctrl key + click
  if (ev.metaKey || ev.ctrlKey) {
    const alreadySelectedIndex = state.extraSelectedNotes.findIndex(
      (nt) => nt?.id === targetNoteId
    );

    // Deselect
    if (alreadySelectedIndex >= 0) {
      state.extraSelectedNotes.splice(alreadySelectedIndex, 1);

      if (state.selectedNote.id === targetNoteId) {
        selectNote(state.extraSelectedNotes[0]?.id);
      }

      // Select next extra note when current selected note is deselected
    } else if (state.selectedNote.id === targetNoteId && hasExtraNotes) {
      selectNote(state.extraSelectedNotes[0]?.id);

      state.extraSelectedNotes.splice(0, 1);

      // Add to selection
    } else if (state.selectedNote.id !== targetNoteId) {
      const foundNote = findNote(targetNoteId);

      if (foundNote) {
        state.extraSelectedNotes.push(foundNote);

        document.addEventListener('click', clearExtraNotes);
      }
    }

    return;
  }

  // Single click
  selectNote(targetNoteId);
}

// Drag bar functionality
function handleDragBar() {
  isDragging.value = true;

  document.addEventListener('mousemove', (ev) => {
    if (!isDragging.value || ev.clientX < 150) return;

    menuWidth.value = `${ev.clientX}px`;
  });
  document.addEventListener(
    'mouseup',
    () => {
      isDragging.value = false;
      localStorage.setItem(STORAGE_KEYS.MENU_WIDTH, menuWidth.value);
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
    const lastSelectedNoteId = state.extraSelectedNotes[0]?.id || state.selectedNote.id;
    // Index of the note we're selecting
    const toIndex = findNoteIndex(lastSelectedNoteId) - directionIndex;

    selectNote(state.notes[toIndex]?.id);
    clearExtraNotes();
  }
}

// Scroll to top when selected note moves to top
watchEffect(() => {
  if (state.selectedNote.id !== state.notes[0]?.id) return;

  // scrollTo is undefined in tests
  if (noteList.value?.scrollTo) {
    noteList.value.scrollTo({ top: 0 });
  }
});

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

$new-note-height: 50px;

#note-menu {
  position: relative;
  max-height: 100vh;
  max-width: 50vw;
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
    color: #fff;
    background-color: var(--colour__interactive);
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
  padding-bottom: 8px;
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
    border: 1px solid var(--colour__interactive);
  }
}
</style>
