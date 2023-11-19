import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { clearMockApiResults, mockApi } from '../../api';
import { awaitSyncLoad, findByTestId, getByTestId } from '../../utils';

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
    const { calls, events, promises } = mockApi();
    const wrapper = mountPopupSyncAuth();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Emits close', async () => {
    mockApi();

    const wrapper = mountPopupSyncAuth();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
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
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      usernameInput.setValue('d');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      passwordInput.setValue('1');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      clearMockApiResults({ calls });

      await formWrapper.trigger('submit');
      await awaitSyncLoad();

      expect(spyLogin).toHaveBeenCalledOnce();
      expect(spySignup).not.toHaveBeenCalled();

      assert.isEmpty(wrapperVm.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(wrapper.emitted('close')?.length, 1);
      assert.strictEqual(calls.length, 3);
      assert.isTrue(calls.has('/login'));
      assert.isTrue(calls.has('new_note'));
      assert.isTrue(calls.has('sync_local_notes'));
    });

    it('On signup', async () => {
      const { calls, events } = mockApi();
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
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      usernameInput.setValue('k');

      assert.isTrue(wrapperVm.validation.username);
      assert.isFalse(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      passwordInput.setValue('2');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isFalse(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      confirmPasswordInput.setValue('3');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);

      await formWrapper.trigger('submit');

      assert.strictEqual(s.syncState.error.type, s.ErrorType.Auth);
      assert.isNotEmpty(s.syncState.error.message);
      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).not.toHaveBeenCalled();

      confirmPasswordInput.setValue('2');

      assert.isTrue(wrapperVm.validation.username);
      assert.isTrue(wrapperVm.validation.password);
      assert.isTrue(wrapperVm.validation.confirmPassword);

      clearMockApiResults({ calls, events });

      await formWrapper.trigger('submit');
      await awaitSyncLoad();

      expect(spyLogin).not.toHaveBeenCalled();
      expect(spySignup).toHaveBeenCalledOnce();
      assert.isEmpty(wrapperVm.confirmPassword);
      assert.strictEqual(s.syncState.error.type, s.ErrorType.None);
      assert.isEmpty(s.syncState.error.message);
      assert.strictEqual(wrapper.emitted('close')?.length, 1);
      assert.strictEqual(calls.length, 1);
      assert.isTrue(calls.has('/signup'));
      assert.strictEqual(events.emits.length, 1);
      assert.isTrue(events.emits.includes('login'));
    });
  });
});
