import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { clearMockApiResults, mockApi, mockDb } from '../../api';
import { waitUntil } from '../../utils';

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
          '/login': [{ notes: mockDb.encryptedNotes }],
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
    await waitUntil(() => !s.syncState.isLoading);

    assert.isFalse(s.syncState.isLoggedIn);
    assert.strictEqual(calls.size, 4);
    assert.isTrue(calls.request.has('/logout'));
    assert.isTrue(calls.invoke.has('get_access_token'));
    assert.deepEqual(calls.invoke[0]!.calledWith, { username: 'd' });
    assert.isTrue(calls.invoke.has('delete_access_token'));
    assert.deepEqual(calls.invoke[1]!.calledWith, { username: 'd' });
    assert.isTrue(calls.emits.has('auth'));
    assert.deepEqual(calls.emits[0]!.calledWith, {
      isFrontendEmit: true,
      data: {
        is_logged_in: false,
      },
    });
  });
});
