<template>
  <Popup @close="emit('close')">
    <div id="sync-auth" data-test-id="popup-auth">
      <h2 data-test-id="heading">{{ capitalise(mode) }}</h2>
      <form @submit.prevent="handleSubmit" class="form" data-test-id="form">
        <input
          v-model="syncState.username"
          @input="validation.username = true"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.username }"
          type="text"
          placeholder="Username"
          ref="usernameInput"
          data-test-id="username"
        />
        <input
          v-model="syncState.password"
          @input="validation.password = true"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.password }"
          type="password"
          placeholder="Password"
          data-test-id="password"
        />
        <input
          v-if="mode === 'signup'"
          v-model="confirmPassword"
          @input="validation.confirmPassword = true"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.confirmPassword }"
          type="password"
          placeholder="Confirm Password"
          data-test-id="confirm-password"
        />
        <p
          v-if="syncState.appError.display?.form"
          class="form__error"
          data-test-id="error-message"
        >
          {{ syncState.appError.message || 'Something went wrong' }}
        </p>
        <input type="submit" value="Submit" class="button button--default" />
      </form>
      <button
        @click="handleFormSwitch"
        class="sync-auth__switch button"
        data-test-id="switch"
      >
        Switch to {{ mode === 'login' ? 'signup' : 'login' }}
      </button>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { login, signup } from '../api';
import { AppError, ERROR_CODE } from '../classes';
import { MIN_PASSWORD_LENGTH } from '../constant';
import { resetAppError, syncState } from '../store/sync';
import { capitalise, tauriListen } from '../utils';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const mode = ref<'login' | 'signup'>('login');
const usernameInput = ref<HTMLInputElement>();
const confirmPassword = ref('');

const validation = reactive({
  username: true,
  password: true,
  confirmPassword: true,
});

async function handleSubmit() {
  validation.username = !!syncState.username;
  validation.password = !!syncState.password;

  if (mode.value === 'signup') {
    validation.confirmPassword = !!confirmPassword.value;
  }

  if (!validation.username || !validation.password) {
    return;
  }

  if (mode.value === 'login') {
    await login();
  } else {
    if (!validation.confirmPassword) {
      return;
    }

    if (syncState.password.length < MIN_PASSWORD_LENGTH) {
      syncState.appError = new AppError({
        code: ERROR_CODE.FORM_VALIDATION,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        display: {
          form: true,
        },
      });

      return;
    }

    if (confirmPassword.value !== syncState.password) {
      syncState.appError = new AppError({
        code: ERROR_CODE.FORM_VALIDATION,
        message: "Passwords don't match",
        display: {
          form: true,
        },
      });

      return;
    }

    await signup();
  }

  if (syncState.appError.isNone) {
    confirmPassword.value = '';

    emit('close');
  }
}

function handleFormSwitch() {
  mode.value = mode.value === 'login' ? 'signup' : 'login';

  if (syncState.appError.display?.form && !syncState.appError.display?.sync) {
    resetAppError();
  }
}

tauriListen('login', () => {
  mode.value = 'login';
});
tauriListen('signup', () => {
  mode.value = 'signup';
});

onMounted(() => {
  usernameInput.value?.focus();
});
</script>

<style lang="scss" scoped>
.sync-auth__switch {
  cursor: pointer;
  margin-top: 12px;
  font-size: 14px;
  text-decoration: underline;

  &:hover {
    text-decoration: none;
  }
}
</style>
