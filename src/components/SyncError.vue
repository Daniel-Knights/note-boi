<template>
  <Popup>
    <div>{{ state.error }}</div>
  </Popup>
</template>

<script lang="ts" setup>
import { state } from '../store/sync';

import Popup from './Popup.vue';
</script>

<style lang="scss"></style>
