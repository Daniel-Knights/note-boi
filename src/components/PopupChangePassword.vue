<template>
  <Popup @close="emit('close')" labelled-by="change-password-heading">
    <div id="change-password" data-test-id="popup-change-password">
      <h2 id="change-password-heading" data-test-id="heading">Change Password</h2>
      <form @submit.prevent="handleSubmit" class="form" data-test-id="form">
        <label for="change-password-current" class="sr-only">Current Password</label>
        <input
          id="change-password-current"
          autocomplete="current-password"
          :aria-invalid="!validation.currentPassword"
          :aria-describedby="errorId"
          v-model="syncState.password"
          @input="validation.currentPassword = true"
          class="form__input"
          name="popup-change-password-current-password"
          :class="{ 'form__input--invalid': !validation.currentPassword }"
          type="password"
          placeholder="Current Password"
          ref="current-password"
          data-test-id="current-password"
        />
        <label for="change-password-new" class="sr-only">New Password</label>
        <input
          id="change-password-new"
          autocomplete="new-password"
          :aria-invalid="!validation.newPassword"
          :aria-describedby="errorId"
          v-model="syncState.newPassword"
          @input="validation.newPassword = true"
          class="form__input"
          name="popup-change-password-new-password"
          :class="{ 'form__input--invalid': !validation.newPassword }"
          type="password"
          placeholder="New Password"
          data-test-id="new-password"
        />
        <label for="change-password-confirm" class="sr-only">Confirm New Password</label>
        <input
          id="change-password-confirm"
          autocomplete="new-password"
          :aria-invalid="!validation.confirmNewPassword"
          :aria-describedby="errorId"
          v-model="confirmNewPassword"
          @input="validation.confirmNewPassword = true"
          class="form__input"
          name="popup-change-password-confirm-new-password"
          :class="{ 'form__input--invalid': !validation.confirmNewPassword }"
          type="password"
          placeholder="Confirm New Password"
          data-test-id="confirm-new-password"
        />
        <p
          v-if="syncState.appError.display?.form"
          id="change-password-error"
          class="form__error"
          role="alert"
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
import { computed, onMounted, reactive, ref, useTemplateRef } from 'vue';

import { changePassword } from '../api';
import { AppError, ERROR_CODE } from '../classes';
import { MIN_PASSWORD_LENGTH } from '../constant';
import { syncState } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const currentPassword = useTemplateRef('current-password');

const confirmNewPassword = ref('');

/** Id of the form error, linked to the inputs while an error is displayed. */
const errorId = computed(() =>
  syncState.appError.display?.form ? 'change-password-error' : undefined
);

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
