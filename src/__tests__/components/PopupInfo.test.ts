import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as s from '../../store/sync';
import pkg from '../../../package.json';
import { mockTauriApi } from '../tauri';
import { getByTestId, setCrypto } from '../utils';

import PopupInfo from '../../components/PopupInfo.vue';

const appVersion = '1.0.0';

function mountPopupInfo() {
  return mount(PopupInfo, {
    global: {
      stubs: { teleport: true },
    },
  });
}

beforeAll(() => {
  setCrypto();
  mockTauriApi(undefined, { appVersion });
});
enableAutoUnmount(afterEach);

describe('PopupInfo', () => {
  it('Mounts', () => {
    const wrapper = mountPopupInfo();
    assert.isTrue(wrapper.isVisible());
  });

  it('Renders correct description list items', async () => {
    s.state.username = 'd';
    s.state.password = '1';
    await s.login();

    const wrapper = mountPopupInfo();

    const userWrapper = getByTestId(wrapper, 'version');
    assert.strictEqual(userWrapper.text(), `Version:${pkg.version}`);

    // Await version fetch
    await new Promise((res) => {
      setTimeout(res, 0);
    });

    const descriptionListItems = wrapper.findAll('.popup-info__description-pair');

    assert.strictEqual(descriptionListItems.length, 4);
    assert.strictEqual(getByTestId(wrapper, 'user').text(), 'User:d');
    assert.strictEqual(getByTestId(wrapper, 'version').text(), `Version:${appVersion}`);

    const repoWrapper = getByTestId(wrapper, 'repo');
    assert.strictEqual(repoWrapper.text(), `Repo:${pkg.repository.url}`);
    assert.strictEqual(repoWrapper.get('a').attributes('href'), pkg.repository.url);

    const issuesWrapper = getByTestId(wrapper, 'issues');
    assert.strictEqual(issuesWrapper.text(), `Issues:${pkg.repository.url}/issues`);
    assert.strictEqual(
      issuesWrapper.get('a').attributes('href'),
      `${pkg.repository.url}/issues`
    );
  });
});