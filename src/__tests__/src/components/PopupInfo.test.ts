import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import pkg from '../../../../package.json';
import { clearMockApiResults, mockApi } from '../../api';
import { findByTestId, getByTestId } from '../../utils';

import Popup from '../../../components/Popup.vue';
import PopupInfo from '../../../components/PopupInfo.vue';

function mountPopupInfo() {
  return mount(PopupInfo, {
    global: {
      stubs: { teleport: true },
    },
  });
}

describe('PopupInfo', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mountPopupInfo();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.size, 1);
    assert.isTrue(calls.tauriApi.has('getAppVersion'));
  });

  it('Emits close', async () => {
    mockApi();

    const wrapper = mountPopupInfo();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.lengthOf(wrapper.emitted('close')!, 1);
  });

  it('Renders correct description list items', async () => {
    const { calls, promises } = mockApi();

    const wrapper = mountPopupInfo();

    assert.lengthOf(wrapper.findAll('.popup-info__description-pair'), 3);
    assert.isFalse(findByTestId(wrapper, 'user').exists());
    assert.strictEqual(getByTestId(wrapper, 'version').text(), `Version:${pkg.version}`);

    let repoWrapper = getByTestId(wrapper, 'repo');

    assert.strictEqual(repoWrapper.text(), `Repo:${pkg.repository.url}`);
    assert.strictEqual(repoWrapper.get('a').attributes('href'), pkg.repository.url);

    let issuesWrapper = getByTestId(wrapper, 'issues');

    assert.strictEqual(issuesWrapper.text(), `Issues:${pkg.repository.url}/issues`);
    assert.strictEqual(
      issuesWrapper.get('a').attributes('href'),
      `${pkg.repository.url}/issues`
    );

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await s.login();

    clearMockApiResults({ calls, promises });

    await Promise.all(promises);

    assert.lengthOf(wrapper.findAll('.popup-info__description-pair'), 4);
    assert.strictEqual(getByTestId(wrapper, 'user').text(), 'User:d');
    assert.strictEqual(getByTestId(wrapper, 'version').text(), `Version:${pkg.version}`);

    repoWrapper = getByTestId(wrapper, 'repo');

    assert.strictEqual(repoWrapper.text(), `Repo:${pkg.repository.url}`);
    assert.strictEqual(repoWrapper.get('a').attributes('href'), pkg.repository.url);

    issuesWrapper = getByTestId(wrapper, 'issues');

    assert.strictEqual(issuesWrapper.text(), `Issues:${pkg.repository.url}/issues`);
    assert.strictEqual(
      issuesWrapper.get('a').attributes('href'),
      `${pkg.repository.url}/issues`
    );
  });
});
