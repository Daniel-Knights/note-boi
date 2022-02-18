<template>
  <section id="menu">
    <ul class="menu__note-list" ref="noteList">
      <li
        v-for="note in state.notes"
        :key="note.id"
        @click="selectNote(note.id)"
        class="menu__note"
        :class="{
          'menu__note--selected': note.id === state.selectedNote.id,
          'menu__note--empty': isEmptyNote(note),
        }"
      >
        <h2 class="menu__title">{{ note.body.text.split(/\n+/)[0] }}</h2>
        <p
          class="menu__body"
          :class="{ 'menu__body--empty': note.body.text.split(/\n+/)[1].trim() === '' }"
        >
          {{ note.body.text.split(/\n+/)[1] }}
        </p>
      </li>
    </ul>
    <button class="menu__new-note" @click="newNote">
      <PlusIcon />
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { state, selectNote, newNote } from '../store';
import { isEmptyNote } from '../utils';

import PlusIcon from './svg/PlusIcon.vue';

const noteList = ref<HTMLElement | undefined>(undefined);

// Scroll to top when selected note moves to top
watchEffect(() => {
  if (state.selectedNote.id !== state.notes[0]?.id) return;

  noteList.value?.scrollTo({ top: 0 });
});
</script>

<style lang="scss" scoped>
$new-note-height: 50px;

#menu {
  position: relative;
  max-height: 100vh;
}

.menu__note-list {
  height: 100%;
  overflow-y: scroll;
  padding-bottom: $new-note-height;

  &::-webkit-scrollbar {
    display: none;
  }
}

.menu__note {
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
    color: var(--color__tertiary);
  }
}

.menu__title,
.menu__body {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.menu__title {
  font-size: 18px;
}

.menu__body {
  margin-top: 3px;
  font-size: 15px;

  &--empty {
    display: none;
  }
}

.menu__new-note {
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
