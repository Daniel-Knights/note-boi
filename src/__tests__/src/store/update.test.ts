import { check } from '@tauri-apps/plugin-updater';

import * as u from '../../../store/update';
import { STORAGE_KEYS } from '../../../constant';
import { clearMockApiResults, mockApi } from '../../api';

describe('Update', () => {
  describe('handleUpdate', () => {
    it('Handles update', async () => {
      const { calls } = mockApi();

      await u.handleUpdate();

      assert.isTrue(u.updateState.isDownloading);
      assert.isTrue(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 4);
      assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.isTrue(calls.tauriApi.has('plugin:updater|download_and_install'));
      assert.isTrue(calls.tauriApi.has('plugin:process|restart'));
    });

    it('Returns if update unavailable', async () => {
      const { calls } = mockApi({
        tauriApi: {
          resValue: {
            checkUpdate: [{ available: false }],
          },
        },
      });

      await u.handleUpdate();

      assert.isFalse(u.updateState.isDownloading);
      assert.isFalse(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
    });

    it("Updates without asking, if updateStrategy is 'auto'", async () => {
      const { calls } = mockApi();

      u.setUpdateStrategy('auto');

      await u.handleUpdate();

      assert.isTrue(u.updateState.isDownloading);
      assert.isTrue(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 3);
      assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
      assert.isTrue(calls.tauriApi.has('plugin:updater|download_and_install'));
      assert.isTrue(calls.tauriApi.has('plugin:process|restart'));
    });

    it('Returns if version has been seen', async () => {
      const { calls } = mockApi();

      localStorage.setItem(STORAGE_KEYS.UPDATE_SEEN, '1.0.0');

      await u.handleUpdate();

      assert.isFalse(u.updateState.isDownloading);
      assert.isTrue(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
    });

    it("Asks if user wants to update and sets seen version if they don't", async () => {
      const { calls } = mockApi({
        tauriApi: {
          resValue: {
            askDialog: [false],
          },
        },
      });

      await u.handleUpdate();

      assert.isFalse(u.updateState.isDownloading);
      assert.isTrue(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:updater|check'));
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[1]!.calledWith, {
        message: 'A new version of NoteBoi is available.\nDo you want to update now?',
        title: 'Update available: v1.0.0',
        kind: undefined,
      });
      assert.strictEqual(localStorage.getItem(STORAGE_KEYS.UPDATE_SEEN), '1.0.0');
    });
  });

  describe('updateAndRelaunch', () => {
    it('Updates and relaunches', async () => {
      const { calls } = mockApi();
      const mockUpdate = (await check())!;

      clearMockApiResults({ calls });

      await u.updateAndRelaunch(mockUpdate);

      assert.isTrue(u.updateState.isDownloading);
      assert.isFalse(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:updater|download_and_install'));
      assert.isTrue(calls.tauriApi.has('plugin:process|restart'));
    });

    it("Catches error and doesn't retry", async () => {
      const { calls } = mockApi({
        tauriApi: {
          error: 'plugin:updater|download_and_install',
          resValue: {
            askDialog: [false],
            downloadAndInstallUpdate: [],
          },
        },
      });

      const mockUpdate = (await check())!;

      clearMockApiResults({ calls });

      await u.updateAndRelaunch(mockUpdate);

      assert.isFalse(u.updateState.isDownloading);
      assert.isFalse(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message: 'Try again?',
        title: 'Unable to install update',
        kind: 'error',
      });
    });

    it('Catches error and retries', async () => {
      const { calls } = mockApi({
        tauriApi: {
          error: 'plugin:updater|download_and_install',
          resValue: {
            askDialog: [true, false],
          },
        },
      });

      const mockUpdate = (await check())!;

      clearMockApiResults({ calls });

      await u.updateAndRelaunch(mockUpdate);

      assert.isFalse(u.updateState.isDownloading);
      assert.isFalse(u.updateState.isAvailable);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask', 2));
    });
  });

  it('setUpdateStrategy', () => {
    assert.strictEqual(u.updateState.strategy, 'manual');
    assert.isNull(localStorage.getItem(STORAGE_KEYS.UPDATE_STRATEGY));

    u.setUpdateStrategy('auto');

    assert.strictEqual(u.updateState.strategy, 'auto');
    assert.strictEqual(localStorage.getItem(STORAGE_KEYS.UPDATE_STRATEGY), 'auto');
  });
});
