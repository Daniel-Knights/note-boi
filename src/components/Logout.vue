<template>
  <button
    v-if="syncState.token"
    @click="logout"
    id="logout"
    class="button"
    title="Logout"
  >
    <LogoutIcon />
  </button>
</template>

<script lang="ts" setup>
import { logout, syncState } from '../store/sync';

import LogoutIcon from './svg/LogoutIcon.vue';
</script>

<style lang="scss" scoped></style>
