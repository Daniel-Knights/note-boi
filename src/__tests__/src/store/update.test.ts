import { Update } from '@tauri-apps/plugin-updater';

import * as u from '../../../store/update';
import { STORAGE_KEYS } from '../../../constant';
import { mockApi } from '../../api';
import { resetUpdateStore } from '../../utils';

const { check, downloadAndInstall, relaunch } = vi.hoisted(() => {
  // Vitest doesn't mock modules that are imported in setup files, and both
  // `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` are
  // transitively imported via `resetUpdateStore` in `setup.ts`.
  // To mock them, we need to clear the module cache before the test file runs.
  vi.resetModules();

  return {
    check: vi.fn(),
    downloadAndInstall: vi.fn(),
    relaunch: vi.fn(),
  };
});

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

  // Because of `vi.resetModules` above, we need to reset the store here, as the
  // reset in `setup.ts` is resetting a different instance of the store.
  resetUpdateStore();
});

afterEach(() => {
  downloadAndInstallShouldThrow = false;
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

    it("Updates without asking, if updateStrategy is 'auto'", async () => {
      const { calls } = mockApi();

      u.setUpdateStrategy('auto');

      await u.handleUpdate();

      expect(check).toHaveBeenCalledOnce();
      expect(downloadAndInstall).toHaveBeenCalledOnce();
      expect(relaunch).toHaveBeenCalledOnce();

      assert.isTrue(u.updateDownloading.value);
      assert.isUndefined(u.update.value);
      assert.strictEqual(calls.size, 0);
    });

    it('Returns if version has been seen', async () => {
      const { calls } = mockApi();

      localStorage.setItem(STORAGE_KEYS.UPDATE_SEEN, '1.0.0');

      await u.handleUpdate();

      expect(check).toHaveBeenCalledOnce();
      expect(downloadAndInstall).not.toHaveBeenCalledOnce();
      expect(relaunch).not.toHaveBeenCalledOnce();

      assert.isFalse(u.updateDownloading.value);
      assert.deepEqual(u.update.value, mockUpdate);
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

      await u.handleUpdate();

      expect(check).toHaveBeenCalled();
      expect(downloadAndInstall).not.toHaveBeenCalled();
      expect(relaunch).not.toHaveBeenCalled();

      assert.isFalse(u.updateDownloading.value);
      assert.deepEqual(u.update.value, mockUpdate);
      assert.strictEqual(calls.size, 1);
      assert.isTrue(calls.tauriApi.has('plugin:dialog|ask'));
      assert.deepEqual(calls.tauriApi[0]!.calledWith, {
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

  it('setUpdateStrategy', () => {
    assert.strictEqual(u.updateStrategy.value, 'manual');
    assert.isNull(localStorage.getItem(STORAGE_KEYS.UPDATE_STRATEGY));

    u.setUpdateStrategy('auto');

    assert.strictEqual(u.updateStrategy.value, 'auto');
    assert.strictEqual(localStorage.getItem(STORAGE_KEYS.UPDATE_STRATEGY), 'auto');
  });
});
