<template>
  <section id="note-menu">
    <ul
      class="note-menu__note-list"
      ref="noteList"
      @contextmenu.prevent="showContextMenu"
    >
      <li
        v-for="note in state.notes"
        :key="note.id"
        @click="selectNote(note.id)"
        class="note-menu__note"
        :class="{
          'note-menu__note--selected': note.id === state.selectedNote.id,
          'note-menu__note--empty': isEmptyNote(note),
        }"
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
    <ContextMenu
      v-if="contextMenuIsVisible"
      :top="contextMenuTop"
      :left="contextMenuLeft"
    />
    <button class="note-menu__new-note" @click="newNote">
      <PlusIcon />
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { state, selectNote, newNote } from '../store';
import { isEmptyNote } from '../utils';

import PlusIcon from './svg/PlusIcon.vue';
import ContextMenu from './ContextMenu.vue';

const noteList = ref<HTMLElement | undefined>(undefined);
const contextMenuIsVisible = ref(false);
const contextMenuTop = ref(0);
const contextMenuLeft = ref(0);

function showContextMenu(ev: MouseEvent) {
  contextMenuIsVisible.value = true;
  contextMenuTop.value = ev.clientY;
  contextMenuLeft.value = ev.clientX;
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
