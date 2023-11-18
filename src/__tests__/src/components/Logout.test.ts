import { mount } from '@vue/test-utils';

import * as s from '../../../store/sync';
import { clearMockApiResults, mockApi, mockDb } from '../../api';
import { awaitSyncLoad } from '../../utils';

import Logout from '../../../components/Logout.vue';

describe('Logout', () => {
  it('Mounts', async () => {
    const { calls, events, promises } = mockApi();
    const wrapper = mount(Logout);

    await Promise.all(promises);

    assert.isFalse(wrapper.isVisible());
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(events.emits.length, 0);
    assert.strictEqual(events.listeners.length, 0);
  });

  it('Logs out on click', async () => {
    const { calls, events } = mockApi({
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

    clearMockApiResults({ calls, events });

    await wrapper.trigger('click');
    await awaitSyncLoad();

    assert.isEmpty(s.syncState.token);
    assert.strictEqual(calls.length, 1);
    assert.isTrue(calls.has('/logout'));
    assert.strictEqual(events.emits.length, 1);
    assert.isTrue(events.emits.includes('logout'));
  });
});
