<template>
  <ul v-if="show" class="context-menu" :style="{ top: top + 'px', left: left + 'px' }">
    <li @click="newNote(true)" data-test-id="new">New Note</li>
    <li
      :class="{ 'context-menu__item--disabled': comp?.hasOneEmptyNote }"
      @click="handleDeleteNote"
      data-test-id="delete"
    >
      Delete Note
    </li>
    <li class="context-menu__has-sub-menu">
      Theme
      <ul data-test-id="theme">
        <li
          v-for="theme in colourThemes"
          :key="theme"
          :class="{ 'context-menu__item--selected': theme === selectedTheme }"
          @click="setTheme(theme)"
        >
          {{ theme }}
        </li>
      </ul>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  state as noteState,
  findNote,
  newNote,
  deleteNote,
  deleteAllNotes,
} from '../store/note';
import { STORAGE_KEYS } from '../constant';
import { isEmptyNote } from '../utils';

const clickedNoteId = ref<string | undefined>(undefined);
const show = ref(false);
const top = ref(0);
const left = ref(0);

const props = defineProps({
  ev: {
    type: MouseEvent || undefined,
    default: undefined,
  },
});

const comp = computed(() => {
  const foundNote = findNote(clickedNoteId.value);

  return {
    hasOneEmptyNote: isEmptyNote(foundNote),
  };
});

type Theme = 'Light' | 'Dark' | 'System';

const colourThemes: Theme[] = ['Light', 'Dark', 'System'];
const selectedTheme = ref(localStorage.getItem(STORAGE_KEYS.THEME) || 'System');

document.body.classList.add(`theme--${selectedTheme.value.toLowerCase()}`);

function setTheme(theme: Theme) {
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

function hide() {
  show.value = false;
  document.removeEventListener('click', hide);
}

watch(props, () => {
  if (!props.ev) return;

  const target = props.ev.target as HTMLElement | null;
  const closestNote = target?.closest<HTMLElement>('[data-note-id]');

  show.value = true;
  top.value = props.ev.clientY;
  left.value = props.ev.clientX;
  clickedNoteId.value = closestNote?.dataset.noteId;

  document.addEventListener('click', hide);
});
</script>

<style lang="scss" scoped>
$list-padding: 3px;
$list-bg-colour: var(--colour__interactive);

ul {
  position: absolute;
  width: 133px;
  color: var(--colour__white);
  background-color: $list-bg-colour;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

li {
  cursor: pointer;
  padding: 0.5em 1em;
  white-space: nowrap;
  border: $list-padding solid $list-bg-colour;

  &:hover {
    background-color: var(--colour__tertiary);
  }
}

.context-menu__item--disabled {
  pointer-events: none;
  color: var(--colour__tertiary);
}

.context-menu__has-sub-menu {
  position: relative;

  > ul {
    display: none;
    top: -$list-padding;
    left: calc(100% + $list-padding);
  }

  &:hover > ul {
    display: block;
  }
}

.context-menu__item--selected {
  background-color: var(--colour__tertiary);
}
</style>
