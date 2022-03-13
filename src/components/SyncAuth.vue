<template>
  <Popup>
    <div id="sync-auth">
      <form @submit.prevent="handleSubmit" class="sync-auth__form">
        <input v-model="state.username" type="text" placeholder="Username" />
        <input v-model="state.password" type="password" placeholder="Password" />
        <input v-if="!isLogin" v-model="confirmPassword" type="password" />
        <input type="submit" value="Submit" />
      </form>
      <button @click="isLogin = !isLogin">
        {{ isLogin ? 'login' : 'signup' }}
      </button>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import { state, login, signup } from '../store/sync';

import Popup from './Popup.vue';

const isLogin = ref(true);
const confirmPassword = ref('');

function handleSubmit() {
  if (isLogin.value) {
    login();
  } else {
    if (confirmPassword.value !== state.password) {
      state.error = "Passwords don't match";
      return;
    }

    signup();
  }
}
</script>

<style lang="scss"></style>
