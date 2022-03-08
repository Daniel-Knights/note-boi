<template>
  <section id="note-menu">
    <ul
      class="note-menu__note-list"
      ref="noteList"
      @contextmenu.prevent="contextMenuEv = $event"
      @click="handleNoteSelect"
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
        <h2 class="note-menu__title">{{ note.content.title }}</h2>
        <p
          class="note-menu__body"
          :class="{ 'note-menu__body--empty': !note.content.body }"
        >
          {{ note.content.body }}
        </p>
      </li>
    </ul>
    <ContextMenu :ev="contextMenuEv" />
    <button class="note-menu__new-note" @click="newNote">
      <PlusIcon />
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';

import {
  state,
  selectNote,
  newNote,
  Note,
  findNoteIndex,
  findNote,
  isSelectedNote,
} from '../store';
import { isEmptyNote, last } from '../utils';

import PlusIcon from './svg/PlusIcon.vue';
import ContextMenu from './ContextMenu.vue';

const noteList = ref<HTMLElement | undefined>(undefined);
const contextMenuEv = ref<MouseEvent | undefined>(undefined);

function handleNoteSelect(ev: MouseEvent) {
  const target = ev.target as HTMLElement | null;
  const closestNote = target?.closest<HTMLElement>('.note-menu__note');
  const targetNoteId = closestNote?.dataset.noteId;
  if (!targetNoteId) return;

  const hasExtraNotes = state.extraSelectedNotes.length > 0;

  function pushExtraNotes(noteSlice: Note[]) {
    const withoutDuplicates = noteSlice.filter((nt) => !isSelectedNote(nt));

    state.extraSelectedNotes.push(...withoutDuplicates);
  }

  function clearExtraNotes(innerEv: MouseEvent) {
    if (innerEv.button !== 0) return; // Only clear on left click
    if (innerEv.metaKey || innerEv.ctrlKey) return;

    state.extraSelectedNotes = [];

    document.removeEventListener('click', clearExtraNotes);
  }

  // Alt key + click
  if (ev.altKey) {
    const targetNoteIndex = findNoteIndex(targetNoteId);

    if (targetNoteIndex >= 0) {
      const lastSelectedNote = hasExtraNotes
        ? last(state.extraSelectedNotes)?.id
        : state.selectedNote.id;
      const selectedNoteIndex = findNoteIndex(lastSelectedNote);

      if (selectedNoteIndex >= 0) {
        const lowestIndex = Math.min(selectedNoteIndex, targetNoteIndex);
        const highestIndex = Math.max(selectedNoteIndex, targetNoteIndex);

        let noteSlice: Note[] = [];

        if (lowestIndex === selectedNoteIndex) {
          // Reverse to ensure correct selection order, `0` = next in queue
          noteSlice = state.notes.slice(lowestIndex + 1, highestIndex + 1).reverse();
        } else if (highestIndex === selectedNoteIndex) {
          noteSlice = state.notes.slice(lowestIndex, highestIndex);
        }

        pushExtraNotes(noteSlice);

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
    } else {
      const foundNote = findNote(targetNoteId);

      if (foundNote) {
        pushExtraNotes([foundNote]);

        document.addEventListener('click', clearExtraNotes);
      }
    }

    return;
  }

  // Single click
  selectNote(targetNoteId);
}

// Scroll to top when selected note moves to top
watchEffect(() => {
  if (state.selectedNote.id !== state.notes[0]?.id) return;

  noteList.value?.scrollTo({ top: 0 });
});
</script>

<style lang="scss" scoped>
$new-note-height: 50px;

#note-menu {
  position: relative;
  max-height: 100vh;
}

.note-menu__note-list {
  height: 100%;
  overflow-y: scroll;
  padding-bottom: $new-note-height;

  &::-webkit-scrollbar {
    display: none;
  }
}

.note-menu__note {
  cursor: pointer;
  position: relative;
  padding: 12px 15px;

  &:hover,
  &--selected {
    color: #fff;
    background-color: var(--color__interactive);
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
  font-size: 18px;
}

.note-menu__body {
  margin-top: 3px;
  font-size: 15px;

  &--empty {
    display: none;
  }
}

.note-menu__new-note {
  @include v.flex-x(center, center);
  position: absolute;
  top: calc(100% - $new-note-height);
  height: $new-note-height;
  width: 100%;
  font-size: 30px;
  color: #fff;
  background-color: var(--color__interactive);
}
</style>
