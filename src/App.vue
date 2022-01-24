<script setup lang="ts">
import { invoke } from '@tauri-apps/api/tauri';

async function newNote(title: string, body: string) {
  const res = await invoke('new_note', { title, body }).catch((err) => {
    console.error(err);
  });

  console.log(res);
}

async function getAllNotes() {
  const notes = await invoke('get_all_notes').catch((err) => {
    console.error(err);
  });

  console.log(notes);
}

async function getNote(id: string) {
  const note = await invoke('get_note', { id }).catch((err) => {
    console.error(err);
  });

  console.log(note);
}

async function deleteNote(id: string) {
  const res = await invoke('delete_note', { id }).catch((err) => {
    console.error(err);
  });

  console.log(res);
}

async function editNote(title: string, body: string) {
  const res = await invoke('new_note', { title, body }).catch((err) => {
    console.error(err);
  });

  console.log(res);
}
</script>

<template>
  <button type="button" @click="newNote('Hello', 'World')">New Note</button>
  <button type="button" @click="getAllNotes()">Get All Notes</button>
  <button type="button" @click="getNote('Hello')">Get Note</button>
  <button type="button" @click="deleteNote('Hello')">Delete Note</button>
  <button type="button" @click="editNote('Goodbye', 'Space')">Edit Note</button>
</template>

<style lang="scss" scoped>
body {
  button {
    margin: 10px;
  }
}
</style>
