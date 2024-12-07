<template>
  <Popup @close="emit('close')">
    <div id="change-password" data-test-id="popup-change-password">
      <h2 data-test-id="heading">Change Password</h2>
      <form @submit.prevent="handleSubmit" class="form" data-test-id="form">
        <input
          v-model="syncState.password"
          @input="validation.currentPassword = true"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.currentPassword }"
          type="password"
          placeholder="Current Password"
          ref="currentPassword"
          data-test-id="current-password"
        />
        <input
          v-model="syncState.newPassword"
          @input="validation.newPassword = true"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.newPassword }"
          type="password"
          placeholder="New Password"
          data-test-id="new-password"
        />
        <input
          v-model="confirmNewPassword"
          @input="validation.confirmNewPassword = true"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.confirmNewPassword }"
          type="password"
          placeholder="Confirm New Password"
          data-test-id="confirm-new-password"
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
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { AppError, ERROR_CODE } from '../classes';
import { MIN_PASSWORD_LENGTH } from '../constant';
import { changePassword, syncState } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const currentPassword = ref<HTMLInputElement>();
const confirmNewPassword = ref('');

const validation = reactive({
  currentPassword: true,
  newPassword: true,
  confirmNewPassword: true,
});

async function handleSubmit() {
  validation.currentPassword = !!syncState.password;
  validation.newPassword = !!syncState.newPassword;
  validation.confirmNewPassword = !!confirmNewPassword.value;

  if (Object.values(validation).some((v) => v === false)) {
    return;
  }

  if (syncState.newPassword.length < MIN_PASSWORD_LENGTH) {
    syncState.appError = new AppError({
      code: ERROR_CODE.FORM_VALIDATION,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      display: {
        form: true,
      },
    });

    return;
  }

  if (confirmNewPassword.value !== syncState.newPassword) {
    syncState.appError = new AppError({
      code: ERROR_CODE.FORM_VALIDATION,
      message: "Passwords don't match",
      display: {
        form: true,
      },
    });

    return;
  }

  if (syncState.newPassword === syncState.password) {
    syncState.appError = new AppError({
      code: ERROR_CODE.FORM_VALIDATION,
      message: 'Current and new passwords must be different',
      display: {
        form: true,
      },
    });

    return;
  }

  await changePassword();

  if (syncState.appError.isNone) {
    confirmNewPassword.value = '';

    emit('close');
  }
}

onMounted(() => {
  currentPassword.value?.focus();
});
</script>

<style lang="scss" scoped></style>
