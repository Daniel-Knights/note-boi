<template>
  <div id="menu">
    <ul class="menu__note-list">
      <li
        v-for="note in state.notes"
        :key="note.id"
        @click="selectNote(note.id)"
        class="menu__note"
        :class="{ 'menu__note--selected': note.id === state.selectedNote?.id }"
      >
        <h2>{{ note.title }}</h2>
        <p>{{ note.body }}</p>
      </li>
    </ul>
    <button class="menu__new-note" @click="newNote">
      <PlusIcon />
    </button>
  </div>
</template>

<script setup lang="ts">
import { state, selectNote, newNote } from '../store';

import PlusIcon from './svg/PlusIcon.vue';
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
    background-color: var(--color__interactive);
  }
}

h2,
p {
  display: block;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

h2 {
  font-size: 18px;
}

p {
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
