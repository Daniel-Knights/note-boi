<template>
  <section id="menu">
    <!-- TODO: contextmenu -->
    <ul class="menu__note-list" ref="noteList">
      <li
        v-for="note in state.notes"
        :key="note.id"
        @click="selectNote(note.id)"
        class="menu__note"
        :class="{ 'menu__note--selected': note.id === state.selectedNote.id }"
      >
        <h2 class="menu__title">{{ isEmptyNote(note) ? 'New note' : note.title }}</h2>
        <p
          v-if="!testWhitespace(note.body)"
          class="menu__body"
          :class="{ 'menu__body--with-title': !testWhitespace(note.title) }"
        >
          {{ note.body }}
        </p>
      </li>
    </ul>
    <button class="menu__new-note" @click="newNote(noteList)">
      <PlusIcon />
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { state, isEmptyNote, selectNote, newNote } from '../store';
import { testWhitespace } from '../utils';

import PlusIcon from './svg/PlusIcon.vue';

const noteList = ref(undefined);
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
}

.menu__title,
.menu__body {
  display: block;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.menu__title,
.menu__body {
  font-size: 18px;
}

.menu__body--with-title {
  margin-top: 8px;
  font-size: 12px;
}

small {
  font-size: 12px;
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
