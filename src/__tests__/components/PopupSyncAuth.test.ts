import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as s from '../../store/sync';
import { mockTauriApi } from '../tauri';
import { findByTestId, getByTestId, resetSyncStore, setCrypto } from '../utils';

import PopupSyncAuth from '../../components/PopupSyncAuth.vue';

function mountPopupSyncAuth() {
  return mount(PopupSyncAuth, {
    global: {
      stubs: { teleport: true },
    },
  });
}

beforeAll(setCrypto);
afterEach(resetSyncStore);
enableAutoUnmount(afterEach);

describe('PopupSyncAuth', () => {
  it('Mounts', () => {
    const wrapper = mountPopupSyncAuth();
    assert.isTrue(wrapper.isVisible());
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

      const usernameInput = wrapper.get<HTMLInputElement>({ ref: 'usernameInput' });
      const passwordInput = getByTestId<HTMLInputElement>(wrapper, 'password');

      assert.isEmpty(usernameInput.element.value);
      assert.isEmpty(passwordInput.element.value);
      assert.isEmpty(s.state.username);
      assert.isEmpty(s.state.password);
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      const spyLogin = vi.spyOn(s, 'login');
      const spySignup = vi.spyOn(s, 'signup');

      const formEl = getByTestId(wrapper, 'form');
      await formEl.trigger('submit');

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

      await mockTauriApi([]);
      await formEl.trigger('submit');

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

      const usernameInput = wrapper.get<HTMLInputElement>({ ref: 'usernameInput' });
      const passwordInput = getByTestId<HTMLInputElement>(wrapper, 'password');
      const confirmPasswordInput = getByTestId<HTMLInputElement>(
        wrapper,
        'confirm-password'
      );

      assert.isEmpty(usernameInput.element.value);
      assert.isEmpty(passwordInput.element.value);
      assert.isEmpty(confirmPasswordInput.element.value);
      assert.isEmpty(s.state.username);
      assert.isEmpty(s.state.password);
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      const spyLogin = vi.spyOn(s, 'login');
      const spySignup = vi.spyOn(s, 'signup');

      const formEl = getByTestId(wrapper, 'form');
      await formEl.trigger('submit');

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

      await mockTauriApi([]);
      await formEl.trigger('submit');

      assert.strictEqual(s.state.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.state.error.message);

      confirmPasswordInput.setValue('World');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      await formEl.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).toHaveBeenCalledOnce();
    });
  });
});
