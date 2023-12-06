import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { MIN_PASSWORD_LENGTH } from '../../../constant';
import { clearMockApiResults, mockApi } from '../../api';
import { awaitSyncLoad, getByTestId } from '../../utils';

import Popup from '../../../components/Popup.vue';
import PopupChangePassword from '../../../components/PopupChangePassword.vue';

function mountPopupChangePassword() {
  return mount(PopupChangePassword, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('PopupChangePassword', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupChangePassword();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Emits close', async () => {
    const wrapper = mountPopupChangePassword();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Validates fields and submits', async () => {
    const { calls } = mockApi();

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await s.login();

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

    await currentPasswordInput.setValue('1');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isFalse(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    newPasswordInput.setValue('2');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    confirmNewPasswordInput.setValue('2');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

    await formWrapper.trigger('submit');

    assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
    assert.strictEqual(
      s.syncState.error.message,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );

    newPasswordInput.setValue('123456');

    await formWrapper.trigger('submit');

    assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
    assert.strictEqual(s.syncState.error.message, "Passwords don't match");

    confirmNewPasswordInput.setValue('123456');

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);
    assert.isNotEmpty(s.syncState.username);
    assert.isNotEmpty(s.syncState.token);
    assert.isNotEmpty(s.syncState.password);
    assert.isNotEmpty(s.syncState.newPassword);
    expect(spyChangePassword).not.toHaveBeenCalled();

    clearMockApiResults({ calls });

    await formWrapper.trigger('submit');
    await awaitSyncLoad();

    expect(spyChangePassword).toHaveBeenCalledOnce();
    assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
    assert.isEmpty(s.syncState.error.message);
    assert.isEmpty(wrapperVm.confirmNewPassword);
    assert.lengthOf(wrapper.emitted('close')!, 1);
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.request.has('/account/password/change'));
  });
});
