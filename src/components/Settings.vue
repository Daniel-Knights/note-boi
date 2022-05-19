<template>
  <button @click="emit('popup')" id="settings">
    <CogIcon />
  </button>
</template>

<script lang="ts" setup>
import CogIcon from './svg/CogIcon.vue';

const emit = defineEmits(['popup']);
</script>

<style lang="scss"></style>
