import { mockIPC } from '@tauri-apps/api/mocks';
import { mount } from '@vue/test-utils';

import {
  awaitSyncLoad,
  findByTestId,
  getByTestId,
  resetSyncStore,
  setCrypto,
} from '../utils';
import { mockTauriApi } from '../tauri';
import * as s from '../../store/sync';

import SyncStatus from '../../components/SyncStatus.vue';

beforeAll(setCrypto);
afterEach(() => {
  resetSyncStore();
  vi.resetAllMocks();
});

describe('SyncStatus', async () => {
  const mockEmits = {
    login: vi.fn(() => undefined),
    logout: vi.fn(() => undefined),
  };

  await mockTauriApi([], mockEmits);

  it('Mounts', () => {
    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());
    expect(mockEmits.logout).toHaveBeenCalled();

    const loadingEl = findByTestId(wrapper, 'loading');
    const errorButton = findByTestId(wrapper, 'error');
    const successEl = findByTestId(wrapper, 'success');
    const syncButton = getByTestId(wrapper, 'sync-button');

    assert.isFalse(loadingEl.exists());
    assert.isFalse(errorButton.exists());
    assert.isFalse(successEl.exists());
    assert.isTrue(syncButton.isVisible());
  });

  it('Pulls on load', async () => {
    const pullSpy = vi.spyOn(s, 'pull');
    s.state.token = 'token';

    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());
    expect(mockEmits.login).toHaveBeenCalled();
    expect(pullSpy).toHaveBeenCalled();

    assert.isTrue(getByTestId(wrapper, 'loading').isVisible());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());

    await awaitSyncLoad();

    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(getByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
  });

  it('Pushes on click', async () => {
    const pushSpy = vi.spyOn(s, 'push');

    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());

    const syncButton = getByTestId(wrapper, 'sync-button');
    await syncButton.trigger('click');

    assert.strictEqual(wrapper.emitted('popup-auth')?.length, 1);

    s.state.token = 'token';
    await syncButton.trigger('click');

    expect(pushSpy).toHaveBeenCalled();

    assert.isTrue(getByTestId(wrapper, 'loading').isVisible());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isFalse(findByTestId(wrapper, 'success').exists());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());

    await awaitSyncLoad();

    assert.isFalse(findByTestId(wrapper, 'loading').exists());
    assert.isFalse(findByTestId(wrapper, 'error').exists());
    assert.isTrue(getByTestId(wrapper, 'success').isVisible());
    assert.isFalse(findByTestId(wrapper, 'sync-button').exists());
  });

  it.each(['Logout', 'Pull', 'Push'] as const)(
    'Displays error icon and emits popup-error on click',
    async (errorType) => {
      s.state.error.type = s.ErrorType[errorType];

      const wrapper = mount(SyncStatus);
      assert.isTrue(wrapper.isVisible());

      const errorButton = getByTestId(wrapper, 'error');
      await errorButton.trigger('click');

      assert.strictEqual(wrapper.emitted('popup-error')?.length, 1);
    }
  );

  it('Listens to Tauri events', () => {
    const listenResults = {
      'push-notes': false,
      'pull-notes': false,
      login: false,
      logout: false,
      signup: false,
    };

    mockIPC((cmd, args) => {
      if (cmd !== 'tauri') return;

      const message = args.message as Record<string, string>;
      const typedEvent = message.event as keyof typeof listenResults;

      if (message.cmd === 'listen' && listenResults[typedEvent] !== undefined) {
        listenResults[typedEvent] = true;
      }
    });

    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());

    Object.entries(listenResults).forEach(([event, result]) => {
      if (!result) {
        assert.fail(`Listener for '${event}' not called`);
      }
    });
  });
});
