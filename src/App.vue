<template>
  <h1>Notes</h1>
  <input v-model="title" type="text" placeholder="Title" />
  <textarea v-model="body" type="text" placeholder="Body"></textarea>
  <button type="button" @click="newNote()">New Note</button>
  <button type="button" @click="getAllNotes()">Get All Notes</button>
  <ul>
    <li v-for="note in notes" :key="note.id">
      <h2>{{ note.title }}</h2>
      <small>Created: {{ note.created_at }}</small
      >&nbsp;<small>Last modified: {{ note.updated_at }}</small>
      <pre>{{ note.body }}</pre>
      <button type="button" @click="getNote(note.id)">Get Note</button>
      <button type="button" @click="deleteNote(note.id)">Delete Note</button>
      <button type="button" @click="editNote(note.id)">Edit Note</button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/tauri';
import { onBeforeMount, ref } from 'vue';

interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

const notes = ref<Note[]>([]);
const title = ref('');
const body = ref('');

async function newNote() {
  const res = await invoke<Note>('new_note', {
    title: title.value,
    body: body.value,
  }).catch((err) => {
    console.error(err);
  });

  if (!res) return;

  notes.value.unshift(res);

  console.log(res);
}

async function getAllNotes() {
  const fetchedNotes = await invoke<Note[]>('get_all_notes').catch((err) => {
    console.error(err);
  });

  if (!fetchedNotes) return;

  notes.value = fetchedNotes;

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

  if (!res) return;

  notes.value = notes.value.filter((note) => note.id !== id);

  console.log(res);
}

async function editNote(id: string) {
  const res = await invoke<Note>('edit_note', {
    id,
    title: title.value,
    body: body.value,
  }).catch((err) => {
    console.error(err);
  });

  if (!res) return;

  notes.value = notes.value.filter((note) => note.id !== id);
  notes.value.unshift(res);

  console.log(res);
}

onBeforeMount(async () => {
  await getAllNotes();

  console.log(notes.value);
});
</script>

<style lang="scss" scoped>
body {
  button {
    margin: 10px;
  }
}
</style>
