import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { MIN_PASSWORD_LENGTH } from '../../../constant';
import { clearMockApiResults, mockApi } from '../../api';
import { findByTestId, getByTestId, waitUntil } from '../../utils';

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
    assert.strictEqual(calls.size, 0);
  });

  it('Emits close', () => {
    mockApi();

    const wrapper = mountPopupSyncAuth();
    wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Switches between login/signup', async () => {
    mockApi();

    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncAuth();

    assert.equal(getByTestId(wrapper, 'heading').text(), 'Login');
    assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

    const switchAuthButton = getByTestId(wrapper, 'switch');
    assert.equal(switchAuthButton.text(), 'Switch to signup');

    await switchAuthButton.trigger('click');

    assert.isFalse(s.syncState.isLogin);
    assert.equal(getByTestId(wrapper, 'heading').text(), 'Signup');
    assert.isTrue(findByTestId(wrapper, 'confirm-password').exists());
    expect(resetErrorSpy).toHaveBeenCalledOnce();
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

      const spyLogin = vi.spyOn(s, 'login');
      const spySignup = vi.spyOn(s, 'signup');

      const formWrapper = getByTestId(wrapper, 'form');
      await formWrapper.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      assert.isFalse(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      usernameInput.setValue('d');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      passwordInput.setValue('1');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      clearMockApiResults({ calls });

      await formWrapper.trigger('submit');
      await waitUntil(() => !s.syncState.isLoading);

      expect(spyLogin).toHaveBeenCalledOnce();
      expect(spySignup).not.toHaveBeenCalled();

      assert.isEmpty(wrapperVm.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);
      assert.isEmpty(s.syncState.error.message);
      assert.lengthOf(wrapper.emitted('close')!, 1);
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.request.has('/login'));
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

      const spyLogin = vi.spyOn(s, 'login');
      const spySignup = vi.spyOn(s, 'signup');

      const formWrapper = getByTestId(wrapper, 'form');
      await formWrapper.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      assert.isFalse(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      usernameInput.setValue('k');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      passwordInput.setValue('2');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      confirmPasswordInput.setValue('2');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);

      await formWrapper.trigger('submit');

      assert.strictEqual(
        s.syncState.error.message,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );

      passwordInput.setValue('123456');

      await formWrapper.trigger('submit');

      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.Auth);
      assert.strictEqual(s.syncState.error.message, "Passwords don't match");

      confirmPasswordInput.setValue('123456');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      clearMockApiResults({ calls });

      await formWrapper.trigger('submit');
      await waitUntil(() => !s.syncState.isLoading);

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).toHaveBeenCalledOnce();
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.strictEqual(s.syncState.error.kind, s.ErrorKind.None);
      assert.isEmpty(s.syncState.error.message);
      assert.lengthOf(wrapper.emitted('close')!, 1);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.request.has('/signup'));
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
