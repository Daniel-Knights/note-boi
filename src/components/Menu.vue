<template>
  <ul id="menu">
    <li v-for="note in state.notes" :key="note.id" @click="selectNote(note.id)">
      <h2>{{ note.title }}</h2>
      <small>Created: {{ note.created_at }}</small
      ><br /><small>Last modified: {{ note.updated_at }}</small>
      <pre>{{ note.body }}</pre>
      <button type="button" @click="deleteNote(note.id)">Delete Note</button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { state, selectNote, deleteNote } from '../store';
</script>

<style lang="scss" scoped></style>
