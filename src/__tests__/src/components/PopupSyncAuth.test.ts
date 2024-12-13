import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { AppError, ERROR_CODE } from '../../../classes';
import { MIN_PASSWORD_LENGTH } from '../../../constant';
import { clearMockApiResults, mockApi } from '../../api';
import { assertAppError, findByTestId, getByTestId, waitUntil } from '../../utils';

import Popup from '../../../components/Popup.vue';
import PopupSyncAuth from '../../../components/PopupSyncAuth.vue';

function mountPopupSyncAuth() {
  return mount(PopupSyncAuth, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('PopupSyncAuth', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupSyncAuth();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('signup'));
  });

  it('Emits close', () => {
    mockApi();

    const wrapper = mountPopupSyncAuth();
    wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Shows error message', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupSyncAuth();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.PULL,
      message: 'Mock error',
      display: { form: true },
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('signup'));

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), 'Mock error');
  });

  it('Shows default error message when none provided', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupSyncAuth();

    s.syncState.appError = new AppError({
      code: ERROR_CODE.PULL,
      display: { form: true },
    });

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.listeners.has('login'));
    assert.isTrue(calls.listeners.has('signup'));

    const errorMessageWrapper = getByTestId(wrapper, 'error-message');
    assert.strictEqual(errorMessageWrapper.text(), 'Something went wrong');
  });

  describe('Switches between login/signup', () => {
    it('Switches', async () => {
      mockApi();

      const resetErrorSpy = vi.spyOn(s, 'resetAppError');
      const wrapper = mountPopupSyncAuth();

      assert.strictEqual(getByTestId(wrapper, 'heading').text(), 'Login');
      assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

      const switchAuthButton = getByTestId(wrapper, 'switch');
      assert.strictEqual(switchAuthButton.text(), 'Switch to signup');

      await switchAuthButton.trigger('click');

      assert.strictEqual(getByTestId(wrapper, 'heading').text(), 'Signup');
      assert.isTrue(findByTestId(wrapper, 'confirm-password').isVisible());
      expect(resetErrorSpy).not.toHaveBeenCalledOnce();
    });

    it('Clears form validation errors', async () => {
      mockApi();

      s.syncState.appError = new AppError({
        code: ERROR_CODE.FORM_VALIDATION,
        message: 'Mock error',
        display: { form: true },
      });

      const resetErrorSpy = vi.spyOn(s, 'resetAppError');
      const wrapper = mountPopupSyncAuth();

      assert.strictEqual(getByTestId(wrapper, 'heading').text(), 'Login');
      assert.strictEqual(getByTestId(wrapper, 'error-message').text(), 'Mock error');
      assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

      const switchAuthButton = getByTestId(wrapper, 'switch');
      assert.strictEqual(switchAuthButton.text(), 'Switch to signup');

      await switchAuthButton.trigger('click');

      assert.strictEqual(getByTestId(wrapper, 'heading').text(), 'Signup');
      assert.isFalse(findByTestId(wrapper, 'error-message').exists());
      assert.isTrue(findByTestId(wrapper, 'confirm-password').isVisible());
      expect(resetErrorSpy).toHaveBeenCalledOnce();
    });

    it('Retains sync errors', async () => {
      mockApi();

      s.syncState.appError = new AppError({
        code: ERROR_CODE.PULL,
        message: 'Mock error',
        display: { form: true, sync: true },
      });

      const resetErrorSpy = vi.spyOn(s, 'resetAppError');
      const wrapper = mountPopupSyncAuth();

      assert.strictEqual(getByTestId(wrapper, 'heading').text(), 'Login');
      assert.strictEqual(getByTestId(wrapper, 'error-message').text(), 'Mock error');
      assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

      const switchAuthButton = getByTestId(wrapper, 'switch');
      assert.strictEqual(switchAuthButton.text(), 'Switch to signup');

      await switchAuthButton.trigger('click');

      assert.strictEqual(getByTestId(wrapper, 'heading').text(), 'Signup');
      assert.strictEqual(getByTestId(wrapper, 'error-message').text(), 'Mock error');
      assert.isTrue(findByTestId(wrapper, 'confirm-password').isVisible());
      expect(resetErrorSpy).not.toHaveBeenCalledOnce();
    });
  });

  describe('Validates fields', () => {
    it('On login', async () => {
      const { calls } = mockApi();

      const wrapper = mountPopupSyncAuth();
      const wrapperVm = wrapper.vm as unknown as {
        confirmPassword: string;
        validation: {
          username: boolean;
          password: boolean;
          confirmPassword: boolean;
        };
      };

      assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

      const usernameInput = getByTestId<HTMLInputElement>(wrapper, 'username');
      const passwordInput = getByTestId<HTMLInputElement>(wrapper, 'password');

      assert.isEmpty(usernameInput.element.value);
      assert.isEmpty(passwordInput.element.value);
      assert.isEmpty(s.syncState.username);
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      const loginSpy = vi.spyOn(s, 'login');
      const signupSpy = vi.spyOn(s, 'signup');

      const formWrapper = getByTestId(wrapper, 'form');
      await formWrapper.trigger('submit');

      expect(loginSpy).not.toHaveBeenCalled();
      expect(signupSpy).not.toHaveBeenCalled();

      assertAppError();
      assert.isFalse(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      usernameInput.setValue('d');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assertAppError();

      passwordInput.setValue('1');

      assertAppError();
      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      clearMockApiResults({ calls });

      await formWrapper.trigger('submit');
      await waitUntil(() => !s.syncState.loadingCount);

      expect(loginSpy).toHaveBeenCalledOnce();
      expect(signupSpy).not.toHaveBeenCalled();

      assertAppError();
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.lengthOf(wrapper.emitted('close')!, 1);
      assert.strictEqual(calls.size, 5);
      assert.isTrue(calls.request.has('/auth/login'));
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'd',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.invoke.has('new_note'));
      assert.isTrue(calls.invoke.has('sync_local_notes'));
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });

    it('On signup', async () => {
      const { calls } = mockApi();
      const wrapper = mountPopupSyncAuth();
      const wrapperVm = wrapper.vm as unknown as {
        confirmPassword: string;
        validation: {
          username: boolean;
          password: boolean;
          confirmPassword: boolean;
        };
      };

      const switchAuthButton = getByTestId(wrapper, 'switch');
      await switchAuthButton.trigger('click');

      const usernameInput = getByTestId<HTMLInputElement>(wrapper, 'username');
      const passwordInput = getByTestId<HTMLInputElement>(wrapper, 'password');
      const confirmPasswordInput = getByTestId<HTMLInputElement>(
        wrapper,
        'confirm-password'
      );

      assert.isEmpty(usernameInput.element.value);
      assert.isEmpty(passwordInput.element.value);
      assert.isEmpty(confirmPasswordInput.element.value);
      assert.isEmpty(s.syncState.username);
      assert.isEmpty(s.syncState.password);
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      const loginSpy = vi.spyOn(s, 'login');
      const signupSpy = vi.spyOn(s, 'signup');

      const formWrapper = getByTestId(wrapper, 'form');
      await formWrapper.trigger('submit');

      expect(loginSpy).not.toHaveBeenCalled();
      expect(signupSpy).not.toHaveBeenCalled();

      assert.isFalse(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assertAppError();

      usernameInput.setValue('k');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assertAppError();

      passwordInput.setValue('2');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assertAppError();

      confirmPasswordInput.setValue('2');

      assertAppError();
      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      await formWrapper.trigger('submit');

      assertAppError({
        code: ERROR_CODE.FORM_VALIDATION,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        display: { form: true },
      });

      passwordInput.setValue('123456');

      await formWrapper.trigger('submit');

      assertAppError({
        code: ERROR_CODE.FORM_VALIDATION,
        message: "Passwords don't match",
        display: { form: true },
      });

      confirmPasswordInput.setValue('123456');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      expect(loginSpy).not.toHaveBeenCalled();
      expect(signupSpy).not.toHaveBeenCalled();

      clearMockApiResults({ calls });

      await formWrapper.trigger('submit');
      await waitUntil(() => !s.syncState.loadingCount);

      expect(loginSpy).not.toHaveBeenCalled();
      expect(signupSpy).toHaveBeenCalledOnce();

      assertAppError();
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.lengthOf(wrapper.emitted('close')!, 1);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.request.has('/auth/signup'));
      assert.isTrue(calls.invoke.has('set_access_token'));
      assert.deepEqual(calls.invoke[0]!.calledWith, {
        username: 'k',
        accessToken: 'test-token',
      });
      assert.isTrue(calls.emits.has('auth'));
      assert.deepEqual(calls.emits[0]!.calledWith, {
        isFrontendEmit: true,
        data: {
          is_logged_in: true,
        },
      });
    });
  });
});
