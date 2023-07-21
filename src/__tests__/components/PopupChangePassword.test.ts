import { mount } from '@vue/test-utils';

import * as s from '../../store/sync';
import { mockTauriApi } from '../tauri';
import { awaitSyncLoad, getByTestId } from '../utils';

import Popup from '../../components/Popup.vue';
import PopupChangePassword from '../../components/PopupChangePassword.vue';

function mountPopupChangePassword() {
  return mount(PopupChangePassword, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('PopupChangePassword', () => {
  it('Mounts', () => {
    const wrapper = mountPopupChangePassword();
    assert.isTrue(wrapper.isVisible());
  });

  it('Emits close', async () => {
    const wrapper = mountPopupChangePassword();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  it('Validates fields and submits', async () => {
    const wrapper = mountPopupChangePassword();
    const wrapperVm = wrapper.vm as unknown as {
      confirmNewPassword: string;
      validation: {
        currentPassword: boolean;
        newPassword: boolean;
        confirmNewPassword: boolean;
      };
    };
    assert.isTrue(wrapper.isVisible());

    const currentPasswordInput = getByTestId<HTMLInputElement>(
      wrapper,
      'current-password'
    );
    const newPasswordInput = getByTestId<HTMLInputElement>(wrapper, 'new-password');
    const confirmNewPasswordInput = getByTestId<HTMLInputElement>(
      wrapper,
      'confirm-new-password'
    );

    assert.isEmpty(currentPasswordInput.element.value);
    assert.isEmpty(newPasswordInput.element.value);
    assert.isEmpty(confirmNewPasswordInput.element.value);
    assert.isEmpty(s.syncState.password);
    assert.isEmpty(s.syncState.newPassword);
    assert.isEmpty(wrapperVm.confirmNewPassword);
    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);

    const spyChangePassword = vi.spyOn(s, 'changePassword');

    const formWrapper = getByTestId(wrapper, 'form');
    await formWrapper.trigger('submit');

    expect(spyChangePassword).not.toHaveBeenCalled();

    assert.isFalse(wrapperVm.validation.currentPassword);
    assert.isFalse(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    await currentPasswordInput.setValue('Hello');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isFalse(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    newPasswordInput.setValue('World');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    confirmNewPasswordInput.setValue('Hello');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    mockTauriApi([]);
    await formWrapper.trigger('submit');

    assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
    assert.isNotEmpty(s.syncState.error.message);

    confirmNewPasswordInput.setValue('World');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);
    expect(spyChangePassword).not.toHaveBeenCalled();

    await formWrapper.trigger('submit');
    await awaitSyncLoad();

    expect(spyChangePassword).toHaveBeenCalledOnce();
    assert.isEmpty(wrapperVm.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
    assert.isEmpty(s.syncState.error.message);
    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });
});
