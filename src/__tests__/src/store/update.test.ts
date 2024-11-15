import { Update } from '@tauri-apps/plugin-updater';

import * as u from '../../../store/update';
import { mockApi } from '../../api';

const { check, downloadAndInstall, relaunch } = vi.hoisted(() => ({
  check: vi.fn(),
  downloadAndInstall: vi.fn(),
  relaunch: vi.fn(),
}));

let downloadAndInstallShouldThrow = false;
let mockUpdate: Update;

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: () => {
    check();

    return Promise.resolve(mockUpdate);
  },
}));

vi.mock('@tauri-apps/plugin-process', () => ({ relaunch }));

beforeEach(() => {
  // @ts-expect-error - don't need to set all properties
  mockUpdate = {
    available: true,
    version: '1.0.0',
    downloadAndInstall: () => {
      if (downloadAndInstallShouldThrow) {
        return Promise.reject(new Error('Update reject'));
      }

      downloadAndInstall();

      return Promise.resolve();
    },
  };
});

afterEach(() => {
  downloadAndInstallShouldThrow = false;

  u.update.value = undefined;
  u.updateDownloading.value = false;
});

describe('Update', () => {
  describe('handleUpdate', () => {
    it('Handles update', async () => {
      const { calls } = mockApi();

      await u.handleUpdate();

      expect(check).toHaveBeenCalledOnce();
      expect(downloadAndInstall).toHaveBeenCalledOnce();
      expect(relaunch).toHaveBeenCalledOnce();

      assert.isTrue(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
    });

    it('Returns if update unavailable', async () => {
      const { calls } = mockApi();

      mockUpdate.available = false;

      await u.handleUpdate();

      expect(check).toHaveBeenCalled();
      expect(downloadAndInstall).not.toHaveBeenCalled();

      assert.isFalse(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 0);
    });

    it('Returns if version has been seen', async () => {
      const { calls } = mockApi();

      localStorage.setItem('update-seen', '1.0.0');

      await u.handleUpdate();

      expect(check).toHaveBeenCalled();
      expect(downloadAndInstall).not.toHaveBeenCalled();

      assert.isFalse(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 0);
    });

    it("Asks if user wants to update and sets seen version if they don't", async () => {
      const { calls } = mockApi({
        tauriApi: {
          resValue: {
            askDialog: [false],
          },
        },
      });

      u.update.value = mockUpdate;

      await u.handleUpdate();

      expect(check).toHaveBeenCalled();
      expect(downloadAndInstall).not.toHaveBeenCalled();

      assert.isFalse(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
        message: 'A new version of NoteBoi is available.\nDo you want to update now?',
        title: 'Update available: v1.0.0',
        kind: undefined,
      });
      assert.strictEqual(localStorage.getItem('update-seen'), '1.0.0');
    });
  });

  describe('updateAndRelaunch', () => {
    it('Updates and relaunches', async () => {
      const { calls } = mockApi();

      u.update.value = mockUpdate;

      await u.updateAndRelaunch();

      expect(downloadAndInstall).toHaveBeenCalledOnce();
      expect(relaunch).toHaveBeenCalledOnce();

      assert.isTrue(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 0);
    });

    it('Returns if update not set', async () => {
      const { calls } = mockApi();

      await u.updateAndRelaunch();

      expect(downloadAndInstall).not.toHaveBeenCalledOnce();
      expect(relaunch).not.toHaveBeenCalledOnce();

      assert.isFalse(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 0);
    });

    it("Catches error and doesn't retry", async () => {
      const { calls } = mockApi({
        tauriApi: {
          resValue: {
            askDialog: [false],
          },
        },
      });

      downloadAndInstallShouldThrow = true;

      u.update.value = mockUpdate;

      await u.updateAndRelaunch();

      assert.isFalse(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
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
          resValue: {
            askDialog: [true, false],
          },
        },
      });

      downloadAndInstallShouldThrow = true;

      u.update.value = mockUpdate;

      await u.updateAndRelaunch();

      assert.isFalse(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 2);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask', 2));
    });
  });
});
