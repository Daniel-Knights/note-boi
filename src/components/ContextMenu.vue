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
        label: 'Delete Note',
        clickHandler: handleDeleteNote,
        disabled: state.notes.length === 1 && isEmptyNote(state.notes[0]),
        testId: 'delete',
      },
    ]"
  >
  </DropMenu>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

import {
  state as noteState,
  newNote,
  deleteNote,
  deleteAllNotes,
  state,
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

function handleDeleteNote() {
  // If multiple notes are selected, delete all of them
  if (noteState.extraSelectedNotes.length > 0) {
    deleteAllNotes();
  } else if (clickedNoteId.value) {
    // Delete clicked note and select next note if currently selected
    deleteNote(clickedNoteId.value, clickedNoteId.value === noteState.selectedNote.id);
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
