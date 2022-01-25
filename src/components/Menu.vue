<template>
  <div id="menu">
    <ul>
      <li v-for="note in state.notes" :key="note.id" @click="selectNote(note.id)">
        <h2>{{ note.title }}</h2>
        <small>Created: {{ note.created_at }}</small>
        <small>Modified: {{ note.updated_at }}</small>
        <p>{{ note.body }}</p>
        <button class="delete-note" type="button" @click.stop="deleteNote(note.id)">
          <BinIcon />
        </button>
      </li>
    </ul>
    <button class="new-note" @click="newNote">+</button>
  </div>
</template>

<script setup lang="ts">
import { state, selectNote, deleteNote, newNote } from '../store';

import BinIcon from './svg/BinIcon.vue';
</script>

<style lang="scss" scoped>
$new-note-height: 50px;

#menu {
  position: relative;
  max-height: 100vh;
}

ul {
  padding: 12px;
  height: 100%;
  overflow-y: scroll;
  padding-bottom: $new-note-height;

  &::-webkit-scrollbar {
    display: none;
  }
}

li {
  > * {
    display: block;
    margin-bottom: 0.5rem;
    white-space: nowrap;
  }

  + li {
    margin-top: 1rem;
  }
}

small {
  font-size: 12px;
}

.delete-note {
  @include v.flex-x(center, center);
  padding: 2px;

  svg {
    fill: red;
    height: 20px;
  }
}

.new-note {
  position: absolute;
  top: calc(100% - $new-note-height);
  height: $new-note-height;
  width: 100%;
  font-size: 30px;
  color: #fff;
}
</style>
