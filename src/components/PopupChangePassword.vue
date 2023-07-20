<template>
  <Popup @close="emit('close')">
    <div id="change-password" data-test-id="popup-auth">
      <h2 data-test-id="heading">Change Password</h2>
      <form @submit.prevent="handleSubmit" class="form" data-test-id="form">
        <input
          v-model="syncState.password"
          @input="validateFields.currentPassword"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.currentPassword }"
          type="password"
          placeholder="Current Password"
          ref="currentPassword"
          data-test-id="current-password"
        />
        <input
          v-model="syncState.newPassword"
          @input="validateFields.newPassword"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.newPassword }"
          type="password"
          placeholder="New Password"
          data-test-id="new-password"
        />
        <input
          v-model="confirmNewPassword"
          @input="validateFields.confirmNewPassword"
          class="form__input"
          :class="{ 'form__input--invalid': !validation.confirmNewPassword }"
          type="password"
          placeholder="Confirm New Password"
          data-test-id="confirm-new-password"
        />
        <p v-if="syncState.error.type === ErrorType.Auth" class="form__error">
          {{ syncState.error.message }}
        </p>
        <input type="submit" value="Submit" class="button button--default" />
      </form>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { ErrorType, syncState, changePassword } from '../store/sync';

import Popup from './Popup.vue';

const emit = defineEmits(['close']);

const currentPassword = ref<HTMLInputElement>();
const confirmNewPassword = ref('');

const validation = reactive({
  currentPassword: true,
  newPassword: true,
  confirmNewPassword: true,
});

const validateFields = {
  currentPassword() {
    validation.currentPassword = !!syncState.password;
  },
  newPassword() {
    validation.newPassword = !!syncState.newPassword;
  },
  confirmNewPassword() {
    validation.confirmNewPassword = !!confirmNewPassword.value;
  },
};

async function handleSubmit() {
  validateFields.currentPassword();
  validateFields.newPassword();
  validateFields.confirmNewPassword();

  if (
    !validation.currentPassword ||
    !validation.newPassword ||
    !validation.confirmNewPassword
  ) {
    return;
  }

  if (confirmNewPassword.value !== syncState.newPassword) {
    syncState.error = {
      type: ErrorType.Auth,
      message: "Passwords don't match",
    };

    return;
  }

  if (syncState.newPassword === syncState.password) {
    syncState.error = {
      type: ErrorType.Auth,
      message: 'Current and new passwords must be different',
    };

    return;
  }

  await changePassword();

  if (syncState.error.type === ErrorType.None) {
    syncState.password = '';
    syncState.newPassword = '';
    confirmNewPassword.value = '';

    emit('close');
  }
}

onMounted(() => {
  currentPassword.value?.focus();
});
</script>

<style lang="scss" scoped></style>
