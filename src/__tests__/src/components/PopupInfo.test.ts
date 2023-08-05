import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import pkg from '../../../../package.json';
import { clearMockApiResults, mockApi } from '../../api';
import { getByTestId } from '../../utils';

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
    const { calls, events, promises } = mockApi({
      api: {
        resValue: pkg.version,
      },
    });
    const wrapper = mountPopupInfo();

    await Promise.all(promises);

    assert.isTrue(wrapper.isVisible());
    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('getAppVersion'));
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Emits close', async () => {
    mockApi();

    const wrapper = mountPopupInfo();
    await wrapper.getComponent(Popup).vm.$emit('close');

    assert.strictEqual(wrapper.emitted('close')?.length, 1);
  });

  it('Renders correct description list items', async () => {
    const { calls, promises } = mockApi({
      api: {
        resValue: pkg.version,
      },
    });

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await s.login();

    clearMockApiResults({ calls, promises });

    const wrapper = mountPopupInfo();
    const userWrapper = getByTestId(wrapper, 'version');

    await Promise.all(promises);

    assert.strictEqual(userWrapper.text(), `Version:${pkg.version}`);

    const descriptionListItems = wrapper.findAll('.popup-info__description-pair');

    assert.strictEqual(descriptionListItems.length, 4);
    assert.strictEqual(getByTestId(wrapper, 'user').text(), 'User:d');
    assert.strictEqual(getByTestId(wrapper, 'version').text(), `Version:${pkg.version}`);

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
