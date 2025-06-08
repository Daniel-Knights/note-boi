import { mount } from '@vue/test-utils';

import * as a from '../../../api';
import * as s from '../../../store/sync';
import { AppError, ERROR_CODE } from '../../../classes';
import { MIN_PASSWORD_LENGTH } from '../../../constant';
import { clearMockApiResults, mockApi } from '../../mock';
import { assertAppError, assertRequest, getByTestId, waitUntil } from '../../utils';

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

  it('Emits close', () => {
    const wrapper = mountPopupChangePassword();
    wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Shows error message', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupChangePassword();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.SYNC,
      message: 'Mock error',
      display: { form: true },
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), 'Mock error');
  });

  it('Shows default error message when none provided', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupChangePassword();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.SYNC,
      display: { form: true },
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), 'Something went wrong');
  });

  it('Validates fields and submits', async () => {
    const { calls } = mockApi();

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await a.login();

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

    const changePasswordSpy = vi.spyOn(a, 'changePassword');

    const formWrapper = getByTestId(wrapper, 'form');
    await formWrapper.trigger('submit');

    expect(changePasswordSpy).not.toHaveBeenCalled();

    assertAppError();
    assert.isFalse(wrapperVm.validation.currentPassword);
    assert.isFalse(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);

    await currentPasswordInput.setValue('1');

    assertAppError();
    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isFalse(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);

    newPasswordInput.setValue('2');

    assertAppError();
    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isFalse(wrapperVm.validation.confirmNewPassword);

    confirmNewPasswordInput.setValue('2');

    assertAppError();
    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);

    await formWrapper.trigger('submit');

    assertAppError({
      code: ERROR_CODE.FORM_VALIDATION,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      display: { form: true },
    });

    newPasswordInput.setValue('123456');

    await formWrapper.trigger('submit');

    assertAppError({
      code: ERROR_CODE.FORM_VALIDATION,
      message: "Passwords don't match",
      display: { form: true },
    });

    confirmNewPasswordInput.setValue('123456');

    expect(changePasswordSpy).not.toHaveBeenCalled();

    assert.isTrue(wrapperVm.validation.currentPassword);
    assert.isTrue(wrapperVm.validation.newPassword);
    assert.isTrue(wrapperVm.validation.confirmNewPassword);
    assert.isNotEmpty(s.syncState.username);
    assert.isTrue(s.syncState.isLoggedIn);
    assert.isNotEmpty(s.syncState.password);
    assert.isNotEmpty(s.syncState.newPassword);

    clearMockApiResults({ calls });

    await formWrapper.trigger('submit');
    await waitUntil(() => !s.syncState.loadingCount);

    expect(changePasswordSpy).toHaveBeenCalledOnce();

    assertAppError();
    assert.isEmpty(wrapperVm.confirmNewPassword);
    assert.lengthOf(wrapper.emitted('close')!, 1);
    assert.strictEqual(calls.size, 3);
    assert.isTrue(calls.request.has('/account/change-password'));
    assertRequest('/account/change-password', calls.request[0]!.calledWith!);
    assert.isTrue(calls.invoke.has('get_access_token'));
    assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    assert.isTrue(calls.invoke.has('set_access_token'));
    assert.deepEqual(calls.invoke[1]!.calledWith, {
      username: 'd',
      accessToken: 'test-token',
    });
  });
});
