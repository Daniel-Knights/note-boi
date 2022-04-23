import { mount } from '@vue/test-utils';

import { findByTestId, getByTestId, resetSyncStore, setCrypto } from '../utils';
import * as s from '../../store/sync';

import SyncAuth from '../../components/SyncAuth.vue';
import { mockTauriApi } from '../tauri';

function mountSyncAuth() {
  return mount(SyncAuth, {
    global: {
      stubs: { teleport: true },
    },
  });
}

beforeAll(setCrypto);
afterEach(resetSyncStore);

describe('SyncAuth', () => {
  it('Mounts', () => {
    const wrapper = mountSyncAuth();
    assert.isTrue(wrapper.isVisible());
  });

  it('Switches between login/signup', async () => {
    const wrapper = mountSyncAuth();
    assert.isTrue(wrapper.isVisible());

    assert.equal(getByTestId(wrapper, 'heading').text(), 'Login');
    assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

    const switchAuthButton = getByTestId(wrapper, 'switch');
    assert.equal(switchAuthButton.text(), 'Switch to signup');

    await switchAuthButton.trigger('click');

    assert.equal(getByTestId(wrapper, 'heading').text(), 'Signup');
    assert.isTrue(findByTestId(wrapper, 'confirm-password').exists());
  });

  describe('Validates fields', () => {
    it('On login', async () => {
      const wrapper = mountSyncAuth();
      assert.isTrue(wrapper.isVisible());
      assert.isFalse(findByTestId(wrapper, 'confirm-password').exists());

      const usernameInput = wrapper.get<HTMLInputElement>({ ref: 'usernameInput' });
      const passwordInput = getByTestId<HTMLInputElement>(wrapper, 'password');

      assert.isEmpty(usernameInput.element.value);
      assert.isEmpty(passwordInput.element.value);
      assert.isEmpty(s.state.username);
      assert.isEmpty(s.state.password);
      assert.isEmpty(wrapper.vm.confirmPassword);
      assert.isTrue(wrapper.vm.validation.username);
      assert.isTrue(wrapper.vm.validation.password);
      assert.isTrue(wrapper.vm.validation.confirmPassword);

      const spyLogin = vi.spyOn(s, 'login');
      const spySignup = vi.spyOn(s, 'signup');

      const formEl = getByTestId(wrapper, 'form');
      await formEl.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      assert.isFalse(wrapper.vm.validation.username);
      assert.isFalse(wrapper.vm.validation.password);
      assert.isTrue(wrapper.vm.validation.confirmPassword);

      usernameInput.setValue('Hello');

      assert.isTrue(wrapper.vm.validation.username);
      assert.isFalse(wrapper.vm.validation.password);
      assert.isTrue(wrapper.vm.validation.confirmPassword);

      passwordInput.setValue('World');

      assert.isTrue(wrapper.vm.validation.username);
      assert.isTrue(wrapper.vm.validation.password);
      assert.isTrue(wrapper.vm.validation.confirmPassword);

      await mockTauriApi([]);
      await formEl.trigger('submit');

      expect(spyLogin).toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();
    });

    it('On signup', async () => {
      const wrapper = mountSyncAuth();
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
      assert.isEmpty(wrapper.vm.confirmPassword);
      assert.isTrue(wrapper.vm.validation.username);
      assert.isTrue(wrapper.vm.validation.password);
      assert.isTrue(wrapper.vm.validation.confirmPassword);

      const spyLogin = vi.spyOn(s, 'login');
      const spySignup = vi.spyOn(s, 'signup');

      const formEl = getByTestId(wrapper, 'form');
      await formEl.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      assert.isFalse(wrapper.vm.validation.username);
      assert.isFalse(wrapper.vm.validation.password);
      assert.isFalse(wrapper.vm.validation.confirmPassword);

      usernameInput.setValue('Hello');

      assert.isTrue(wrapper.vm.validation.username);
      assert.isFalse(wrapper.vm.validation.password);
      assert.isFalse(wrapper.vm.validation.confirmPassword);

      passwordInput.setValue('World');

      assert.isTrue(wrapper.vm.validation.username);
      assert.isTrue(wrapper.vm.validation.password);
      assert.isFalse(wrapper.vm.validation.confirmPassword);

      confirmPasswordInput.setValue('World');

      assert.isTrue(wrapper.vm.validation.username);
      assert.isTrue(wrapper.vm.validation.password);
      assert.isTrue(wrapper.vm.validation.confirmPassword);

      await mockTauriApi([]);
      await formEl.trigger('submit');

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).toHaveBeenCalled();
    });
  });
});
