<template>
  <Popup>
    <div>{{ state.error }}</div>
    <button
      @click="
        push();
        resetError();
        emit('close');
      "
    >
      Try Again?
    </button>
  </Popup>
</template>

<script lang="ts" setup>
import { state, resetError, push } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);
</script>

<style lang="scss"></style>
