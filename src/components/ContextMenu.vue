<template>
  <DropMenu
    v-if="show"
    @close="show = false"
    :style="{ top: top + 'px', left: left + 'px' }"
    :items="items"
    :close-on-click="true"
    ref="drop-menu"
  >
  </DropMenu>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import {
  deleteNote,
  deleteSelectedNotes,
  exportNotes,
  importNotesFromFileChooser,
  noteState,
} from '../store/note';
import { isEmptyNote } from '../utils';

import { DropMenuItemData } from './types';

import DropMenu from './DropMenu.vue';

const props = defineProps<{
  handleNewNote: () => void;
  ev?: MouseEvent;
}>();

const dropMenu = useTemplateRef('drop-menu');

const clickedNoteUuid = ref<string>();
const show = ref(false);
const top = ref(0);
const left = ref(0);

const items = computed<DropMenuItemData[]>(() => {
  const hasNoNotes = noteState.notes.length === 1 && isEmptyNote(noteState.notes[0]);

  return [
    {
      label: 'New Note',
      clickHandler: props.handleNewNote,
      testId: 'new',
    },
    {
      label: 'Export Note',
      clickHandler: handleExportNotes,
      showIf: () => !!clickedNoteUuid.value && !hasNoNotes,
      testId: 'export',
    },
    {
      label: 'Export All Notes',
      testId: 'export-all',
      clickHandler: () => exportNotes(noteState.notes.map((nt) => nt.uuid)),
    },
    {
      label: 'Import Notes',
      testId: 'import',
      // NOTE: This needs to be called within an arrow function,
      //       so it can be spied on in tests.
      clickHandler: () => importNotesFromFileChooser(),
    },
    {
      label: 'Delete Note',
      clickHandler: handleDeleteNote,
      showIf: () => !!clickedNoteUuid.value && !hasNoNotes,
      testId: 'delete',
      danger: true,
    },
  ];
});

function handleExportNotes() {
  if (noteState.extraSelectedNotes.length > 0) {
    exportNotes([
      noteState.selectedNote.uuid,
      ...noteState.extraSelectedNotes.map((nt) => nt.uuid),
    ]);
  } else if (clickedNoteUuid.value) {
    exportNotes([clickedNoteUuid.value]);
  }
}

function handleDeleteNote() {
  if (noteState.extraSelectedNotes.length > 0) {
    deleteSelectedNotes();
  } else if (clickedNoteUuid.value) {
    deleteNote(clickedNoteUuid.value);
  }
}

watch(props, async () => {
  if (!props.ev) return;

  const target = props.ev.target as HTMLElement | null;
  const closestNote = target?.closest<HTMLElement>('[data-note-uuid]');

  show.value = true;
  clickedNoteUuid.value = closestNote?.dataset.noteUuid;

  // Wait for `DropMenu` to mount, so we can read height
  await nextTick();

  const dropMenuHeight = dropMenu.value?.$el.clientHeight ?? 120; // Fallback for tests
  const dropMenuWidth = dropMenu.value?.$el.clientWidth ?? 200; // Fallback for tests
  const maxY = window.innerHeight - dropMenuHeight - 10; // 10 = a bit of padding
  const maxX = window.innerWidth - dropMenuWidth - 10; // 10 = a bit of padding

  top.value = Math.min(props.ev.y, maxY);
  left.value = Math.min(props.ev.x, maxX);
});
</script>

<style lang="scss" scoped></style>
