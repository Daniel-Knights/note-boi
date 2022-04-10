<template>
  <Popup @close="emit('close')">
    <div id="sync-auth">
      <h2>{{ state.isLogin ? 'Login' : 'Signup' }}</h2>
      <form @submit.prevent="handleSubmit" class="sync-auth__form">
        <input
          v-model="state.username"
          @input="validateFields"
          :class="{ 'sync-auth__input--error': !validation.username }"
          type="text"
          placeholder="Username"
          ref="usernameInput"
        />
        <input
          v-model="state.password"
          @input="validateFields"
          :class="{ 'sync-auth__input--error': !validation.password }"
          type="password"
          placeholder="Password"
        />
        <input
          v-if="!state.isLogin"
          v-model="confirmPassword"
          @input="validateFields"
          :class="{ 'sync-auth__input--error': !validation.confirmPassword }"
          type="password"
          placeholder="Confirm Password"
        />
        <p v-if="state.error.type === ErrorType.Auth" class="sync-auth__error">
          {{ state.error.message }}
        </p>
        <input type="submit" value="Submit" class="button--default" />
      </form>
      <button
        @click="
          state.isLogin = !state.isLogin;
          resetError();
        "
        class="sync-auth__switch"
      >
        Switch to {{ state.isLogin ? 'signup' : 'login' }}
      </button>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { ErrorType, resetError, state, login, signup } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const usernameInput = ref<HTMLInputElement | null>(null);
const confirmPassword = ref('');

const validation = reactive({
  username: true,
  password: true,
  confirmPassword: true,
});

function validateFields() {
  validation.username = !!state.username;
  validation.password = !!state.password;
  if (!state.isLogin) validation.confirmPassword = !!confirmPassword.value;
}

async function handleSubmit() {
  validateFields();

  if (!validation.username || !validation.password) {
    return;
  }

  if (state.isLogin) {
    await login();
  } else {
    if (!confirmPassword.value) {
      validation.confirmPassword = false;
      return;
    }
    if (confirmPassword.value !== state.password) {
      state.error = { type: ErrorType.Auth, message: "Passwords don't match" };
      return;
    }

    await signup();
  }

  if (state.error.type === ErrorType.None) {
    confirmPassword.value = '';
    emit('close');
  }
}

onMounted(() => {
  if (usernameInput.value) {
    usernameInput.value.focus();
  }
});
</script>

<style lang="scss" scoped>
#sync-auth,
.sync-auth__form {
  > * + * {
    margin-top: 12px;
  }
}

.sync-auth__form {
  @include v.flex-y(false, center);
}

.sync-auth__input--error {
  border-color: var(--color__error);
}

.sync-auth__error {
  color: var(--color__error);
}

.sync-auth__switch {
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;

  &:hover {
    text-decoration: none;
  }
}
</style>
