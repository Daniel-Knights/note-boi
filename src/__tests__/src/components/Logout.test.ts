import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { clearMockApiResults, mockApi, mockDb } from '../../api';
import { awaitSyncLoad } from '../../utils';

import Logout from '../../../components/Logout.vue';

describe('Logout', () => {
  it('Mounts', async () => {
    const { calls, promises } = mockApi();
    const wrapper = mount(Logout);

    await Promise.all(promises);

    assert.isFalse(wrapper.isVisible());
    assert.strictEqual(calls.size, 0);
  });

  it('Logs out on click', async () => {
    const { calls } = mockApi({
      request: {
        resValue: {
          '/login': [{ notes: mockDb.encryptedNotes, token: 'token' }],
        },
      },
    });

    const wrapper = mount(Logout);
    assert.isFalse(wrapper.isVisible());

    s.syncState.username = 'd';
    s.syncState.password = '1';

    await s.login();

    assert.isTrue(wrapper.isVisible());

    clearMockApiResults({ calls });

    await wrapper.trigger('click');
    await awaitSyncLoad();

    assert.isEmpty(s.syncState.token);
    assert.strictEqual(calls.size, 2);
    assert.isTrue(calls.request.has('/logout'));
    assert.isTrue(calls.emits.has('logout'));
  });
});
