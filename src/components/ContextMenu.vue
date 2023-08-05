<template>
  <DropMenu
    v-if="show"
    @close="show = false"
    :style="{ top: top + 'px', left: left + 'px' }"
    :items="[
      {
        label: 'New Note',
        clickHandler: () => newNote(true),
        testId: 'new',
      },
      {
        label: 'Export Note',
        clickHandler: handleExportNotes,
        disabled: noteState.notes.length === 1 && isEmptyNote(noteState.notes[0]),
        testId: 'export',
      },
      {
        label: 'Delete Note',
        clickHandler: handleDeleteNote,
        disabled: noteState.notes.length === 1 && isEmptyNote(noteState.notes[0]),
        testId: 'delete',
      },
    ]"
  >
  </DropMenu>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

import {
  deleteNote,
  deleteSelectedNotes,
  exportNotes,
  newNote,
  noteState,
} from '../store/note';
import { isEmptyNote } from '../utils';

import DropMenu from './DropMenu.vue';

const props = defineProps({
  ev: {
    type: MouseEvent || undefined,
    default: undefined,
  },
});

const clickedNoteId = ref<string>();
const show = ref(false);
const top = ref(0);
const left = ref(0);

function handleExportNotes() {
  if (noteState.extraSelectedNotes.length > 0) {
    exportNotes([
      noteState.selectedNote.id,
      ...noteState.extraSelectedNotes.map((nt) => nt.id),
    ]);
  } else if (clickedNoteId.value) {
    exportNotes([clickedNoteId.value]);
  }
}

function handleDeleteNote() {
  if (noteState.extraSelectedNotes.length > 0) {
    deleteSelectedNotes();
  } else if (clickedNoteId.value) {
    deleteNote(clickedNoteId.value);
  }
}

watch(props, () => {
  if (!props.ev) return;

  const target = props.ev.target as HTMLElement | null;
  const closestNote = target?.closest<HTMLElement>('[data-note-id]');

  show.value = true;
  top.value = props.ev.clientY;
  left.value = props.ev.clientX;
  clickedNoteId.value = closestNote?.dataset.noteId;
});
</script>

<style lang="scss" scoped></style>
