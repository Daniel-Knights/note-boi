import { enableAutoUnmount, mount } from '@vue/test-utils';

import * as s from '../../store/sync';
import { openedPopup, PopupType } from '../../store/popup';
import { mockTauriApi, testTauriListen } from '../tauri';
import {
  awaitSyncLoad,
  findByTestId,
  getByTestId,
  resetSyncStore,
  setCrypto,
} from '../utils';

import SyncStatus from '../../components/SyncStatus.vue';

beforeAll(setCrypto);
enableAutoUnmount(afterEach);
afterEach(() => {
  resetSyncStore();
  vi.resetAllMocks();
});

describe('SyncStatus', async () => {
  const mockEmits = {
    login: vi.fn(),
    logout: vi.fn(),
  };

  await mockTauriApi([], mockEmits);

  function mountWithPopup() {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    return mount(SyncStatus, {
      attachTo: appDiv,
      global: {
        stubs: { teleport: true },
      },
    });
  }

  it('Mounts', () => {
    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());
    expect(mockEmits.logout).toHaveBeenCalledOnce();

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
    expect(mockEmits.login).toHaveBeenCalledOnce();
    expect(pullSpy).toHaveBeenCalledOnce();

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

    const wrapper = mountWithPopup();
    assert.isTrue(wrapper.isVisible());

    const syncButton = getByTestId(wrapper, 'sync-button');
    await syncButton.trigger('click');

    assert.strictEqual(openedPopup.value, PopupType.Auth);

    s.state.token = 'token';
    await syncButton.trigger('click');

    expect(pushSpy).toHaveBeenCalledOnce();

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
    '%s - Displays error icon and opens popup on click',
    async (errorType) => {
      s.state.error.type = s.ErrorType[errorType];

      const wrapper = mountWithPopup();
      assert.isTrue(wrapper.isVisible());

      const errorButton = getByTestId(wrapper, 'error');
      await errorButton.trigger('click');

      assert.isTrue(findByTestId(wrapper, 'error-message').exists());
      assert.isTrue(findByTestId(wrapper, 'try-again').exists());
    }
  );

  it('Listens to Tauri events', () => {
    const listenResults = testTauriListen(['push-notes', 'login', 'logout', 'signup']);

    const wrapper = mount(SyncStatus);
    assert.isTrue(wrapper.isVisible());

    Object.entries(listenResults).forEach(([event, result]) => {
      if (!result) {
        assert.fail(`Listener for '${event}' not called`);
      }
    });
  });
});
