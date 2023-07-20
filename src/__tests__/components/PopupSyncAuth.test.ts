import { mount } from '@vue/test-utils';

import * as s from '../../store/sync';
import { mockTauriApi } from '../tauri';
import { findByTestId, getByTestId } from '../utils';

import Popup from '../../components/Popup.vue';
import PopupSyncAuth from '../../components/PopupSyncAuth.vue';

function mountPopupSyncAuth() {
  return mount(PopupSyncAuth, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('PopupSyncAuth', () => {
  it('Mounts', () => {
    const wrapper = mountPopupSyncAuth();
    assert.isTrue(wrapper.isVisible());
  });

  it('Emits close', async () => {
    const wrapper = mountPopupSyncAuth();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  it('Switches between login/signup', async () => {
    const resetErrorSpy = vi.spyOn(s, 'resetError');
    const wrapper = mountPopupSyncAuth();
    assert.isTrue(wrapper.isVisible());

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
      const wrapper = mountPopupSyncAuth();
      const wrapperVm = wrapper.vm as unknown as {
        confirmPassword: string;
        validation: {
          username: boolean;
          password: boolean;
          confirmPassword: boolean;
        };
      };
      assert.isTrue(wrapper.isVisible());
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

      usernameInput.setValue('Hello');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      passwordInput.setValue('World');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      mockTauriApi([]);
      await formWrapper.trigger('submit');

      expect(spyLogin).toHaveBeenCalledOnce();
      expect(spySignup).not.toHaveBeenCalled();
    });

    it('On signup', async () => {
      const wrapper = mountPopupSyncAuth();
      const wrapperVm = wrapper.vm as unknown as {
        confirmPassword: string;
        validation: {
          username: boolean;
          password: boolean;
          confirmPassword: boolean;
        };
      };
      assert.isTrue(wrapper.isVisible());

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

      usernameInput.setValue('Hello');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);

      passwordInput.setValue('World');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);

      confirmPasswordInput.setValue('Hello');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      mockTauriApi([]);
      await formWrapper.trigger('submit');

      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);

      confirmPasswordInput.setValue('World');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      await formWrapper.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).toHaveBeenCalledOnce();
    });
  });
});
