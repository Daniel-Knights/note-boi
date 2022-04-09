<template>
  <button v-if="state.token" @click="logout" id="logout" title="Logout">
    <LogoutIcon />
  </button>
</template>

<script lang="ts" setup>
import { state, logout } from '../store/sync';

import LogoutIcon from './svg/LogoutIcon.vue';
</script>

<style lang="scss" scoped>
#logout {
  position: absolute;
  right: v.$sync-icon-right;
  top: 48px;
  @include v.equal-dimensions(v.$sync-icon-dimensions);
}
</style>
