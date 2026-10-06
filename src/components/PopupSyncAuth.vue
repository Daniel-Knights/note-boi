<template>
  <Popup @close="emit('close')" labelled-by="sync-auth-heading">
    <div id="sync-auth" data-test-id="popup-auth">
      <h2 id="sync-auth-heading" data-test-id="heading">{{ capitalise(mode) }}</h2>
      <form @submit.prevent="handleSubmit" class="form" data-test-id="form">
        <label for="sync-auth-username" class="sr-only">Username</label>
        <input
          v-model="syncState.username"
          id="sync-auth-username"
          autocomplete="username"
          :aria-invalid="!validation.username"
          :aria-describedby="errorId"
          @input="validation.username = true"
          class="form__input"
          name="popup-sync-auth-username"
          :class="{ 'form__input--invalid': !validation.username }"
          type="text"
          placeholder="Username"
          ref="username-input"
          data-test-id="username"
        />
        <label for="sync-auth-password" class="sr-only">Password</label>
        <input
          v-model="syncState.password"
          id="sync-auth-password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          :aria-invalid="!validation.password"
          :aria-describedby="errorId"
          @input="validation.password = true"
          class="form__input"
          name="popup-sync-auth-password"
          :class="{ 'form__input--invalid': !validation.password }"
          type="password"
          placeholder="Password"
          data-test-id="password"
        />
        <label v-if="mode === 'signup'" for="sync-auth-confirm-password" class="sr-only">
          Confirm Password
        </label>
        <input
          v-if="mode === 'signup'"
          id="sync-auth-confirm-password"
          autocomplete="new-password"
          :aria-invalid="!validation.confirmPassword"
          :aria-describedby="errorId"
          v-model="confirmPassword"
          @input="validation.confirmPassword = true"
          class="form__input"
          name="popup-sync-auth-confirm-password"
          :class="{ 'form__input--invalid': !validation.confirmPassword }"
          type="password"
          placeholder="Confirm Password"
          data-test-id="confirm-password"
        />
        <p
          v-if="syncState.appError.display?.form"
          id="sync-auth-error"
          class="form__error"
          role="alert"
          data-test-id="error-message"
        >
          {{ syncState.appError.message || 'Something went wrong' }}
        </p>
        <input
          type="submit"
          value="Submit"
          class="button button--default"
          :disabled="syncState.loadingCount > 0"
          data-test-id="submit"
        />
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
import { computed, onMounted, reactive, ref, useTemplateRef } from 'vue';

import { login, signup } from '../api';
import { AppError, ERROR_CODE } from '../classes';
import { MIN_PASSWORD_LENGTH } from '../constant';
import { resetAppError, syncState } from '../store/sync';
import { capitalise, tauriListen } from '../utils';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const usernameInput = useTemplateRef('username-input');

const mode = ref<'login' | 'signup'>('login');

/** Id of the form error, linked to the inputs while an error is displayed. */
const errorId = computed(() =>
  syncState.appError.display?.form ? 'sync-auth-error' : undefined
);
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
