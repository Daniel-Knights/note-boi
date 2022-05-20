<template>
  <DropMenu
    v-if="show"
    :style="{ top: top + 'px', left: left + 'px' }"
    :items="menuItems"
  >
  </DropMenu>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  state as noteState,
  findNote,
  newNote,
  deleteNote,
  deleteAllNotes,
  state,
} from '../store/note';
import { STORAGE_KEYS } from '../constant';
import { isEmptyNote } from '../utils';
import { DropMenuItemData } from './types';

import DropMenu from './DropMenu.vue';

const props = defineProps({
  ev: {
    type: MouseEvent || undefined,
    default: undefined,
  },
});

const clickedNoteId = ref<string | undefined>(undefined);
const show = ref(false);
const top = ref(0);
const left = ref(0);

const comp = computed(() => {
  const foundNote = findNote(clickedNoteId.value);

  return {
    hasOneEmptyNote: state.notes.length === 1 && isEmptyNote(foundNote),
  };
});

const colourThemes = ['Light', 'Dark', 'System'] as const;
const selectedTheme = ref(localStorage.getItem(STORAGE_KEYS.THEME) || 'System');
const menuItems = ref<DropMenuItemData[]>([
  {
    label: 'New Note',
    clickHandler: () => newNote(true),
    testId: 'new',
  },
  {
    label: 'Delete Note',
    clickHandler: handleDeleteNote,
    disabled: comp.value.hasOneEmptyNote,
    testId: 'delete',
  },
  {
    label: 'Theme',
    subMenu: colourThemes.map((theme) => {
      return {
        label: theme,
        clickHandler: () => setTheme(theme),
        selected: theme === selectedTheme.value,
      };
    }),
  },
]);

document.body.classList.add(`theme--${selectedTheme.value.toLowerCase()}`);

function setTheme(theme: typeof colourThemes[number]) {
  document.body.classList.remove(`theme--${selectedTheme.value.toLowerCase()}`);
  document.body.classList.add(`theme--${theme.toLowerCase()}`);

  localStorage.setItem(STORAGE_KEYS.THEME, theme);

  selectedTheme.value = theme;
}

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
