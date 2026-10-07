import { mount } from '@vue/test-utils';

import { AppError, ERROR_CODE } from '../../../classes';
import { syncState } from '../../../store/sync';
import { mockApi } from '../../mock';
import { getAppDiv, getTeleportMountOptions } from '../../utils';

import Popup from '../../../components/Popup.vue';
import PopupChangePassword from '../../../components/PopupChangePassword.vue';
import PopupSyncAuth from '../../../components/PopupSyncAuth.vue';

describe('Popup accessibility', () => {
  let appDiv: HTMLElement;

  afterEach(() => {
    appDiv.remove();
  });

  beforeEach(() => {
    mockApi();
    appDiv = getAppDiv();
    document.body.appendChild(appDiv);
  });

  it('Is a labelled modal dialog', () => {
    const wrapper = mount(Popup, {
      props: { labelledBy: 'heading' },
      slots: { default: '<h2 id="heading">Title</h2>' },
      ...getTeleportMountOptions(appDiv),
    });
    const dialog = appDiv.querySelector('[role="dialog"]')!;

    assert.strictEqual(dialog.getAttribute('aria-modal'), 'true');
    assert.strictEqual(dialog.getAttribute('aria-labelledby'), 'heading');

    wrapper.unmount();
  });

  it('Focuses inside, marks the background inert, and restores focus', () => {
    const opener = document.createElement('button');
    const sibling = document.createElement('div');

    appDiv.append(opener, sibling);
    opener.focus();

    const wrapper = mount(Popup, {
      slots: { default: '<button id="a">A</button><button id="b">B</button>' },
      ...getTeleportMountOptions(appDiv),
    });

    assert.strictEqual(document.activeElement?.id, 'a');
    assert.isTrue(sibling.hasAttribute('inert'));

    wrapper.unmount();

    assert.isFalse(sibling.hasAttribute('inert'));
    assert.strictEqual(document.activeElement, opener);
  });

  it('Traps Tab focus within the dialog', () => {
    const wrapper = mount(Popup, {
      slots: { default: '<button id="a">A</button><button id="b">B</button>' },
      ...getTeleportMountOptions(appDiv),
    });
    const press = (shiftKey: boolean) =>
      appDiv
        .querySelector('[role="dialog"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true })
        );

    document.getElementById('b')!.focus();
    press(false);
    assert.strictEqual(document.activeElement?.id, 'a');

    press(true);
    assert.strictEqual(document.activeElement?.id, 'b');

    wrapper.unmount();
  });

  it('Labels sync auth inputs with correct autocomplete', () => {
    const wrapper = mount(PopupSyncAuth, { attachTo: document.body });
    const username = appDiv.querySelector<HTMLInputElement>('#sync-auth-username')!;
    const password = appDiv.querySelector<HTMLInputElement>('#sync-auth-password')!;

    assert.isNotNull(appDiv.querySelector('label[for="sync-auth-username"]'));
    assert.isNotNull(appDiv.querySelector('label[for="sync-auth-password"]'));
    assert.strictEqual(username.autocomplete, 'username');
    assert.strictEqual(password.autocomplete, 'current-password');
    assert.strictEqual(username.getAttribute('aria-invalid'), 'false');

    wrapper.unmount();
  });

  it('Links form errors to inputs', () => {
    syncState.appError = new AppError({
      code: ERROR_CODE.FORM_VALIDATION,
      message: 'Oops',
      display: { form: true },
    });

    const wrapper = mount(PopupChangePassword, { attachTo: document.body });
    const error = appDiv.querySelector('#change-password-error')!;

    assert.strictEqual(error.getAttribute('role'), 'alert');
    assert.strictEqual(
      appDiv.querySelector('#change-password-new')!.getAttribute('aria-describedby'),
      'change-password-error'
    );

    wrapper.unmount();
  });
});
