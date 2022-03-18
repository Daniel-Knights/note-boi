<template>
  <Popup>
    <div id="sync-auth">
      <h2>{{ state.isLogin ? 'Login' : 'Signup' }}</h2>
      <form @submit.prevent="handleSubmit" class="sync-auth__form">
        <input v-model="state.username" type="text" placeholder="Username" />
        <input v-model="state.password" type="password" placeholder="Password" />
        <input v-if="!state.isLogin" v-model="confirmPassword" type="password" />
        <p v-if="state.error.type === ErrorType.Auth" class="sync-auth__error">
          {{ state.error.message }}
        </p>
        <input type="submit" value="Submit" />
      </form>
      <button
        @click="
          state.isLogin = !state.isLogin;
          resetError();
        "
      >
        Switch to {{ state.isLogin ? 'signup' : 'login' }}
      </button>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import { ErrorType, resetError, state, login, signup } from '../store/sync';

import Popup from './Popup.vue';

const confirmPassword = ref('');

function handleSubmit() {
  if (state.isLogin) {
    login();
  } else {
    if (confirmPassword.value !== state.password) {
      state.error = { type: ErrorType.Auth, message: "Passwords don't match" };
      return;
    }

    signup();
  }
}
</script>

<style lang="scss"></style>
