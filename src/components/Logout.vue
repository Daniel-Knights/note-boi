<template>
  <button v-if="state.token" @click="logout" id="logout" title="Logout">
    <LogoutIcon />
  </button>
</template>

<script lang="ts" setup>
import { logout, state } from '../store/sync';

import LogoutIcon from './svg/LogoutIcon.vue';
</script>

<style lang="scss" scoped></style>
