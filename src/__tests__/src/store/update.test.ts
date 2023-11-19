import * as u from '../../../store/update';
import { mockApi } from '../../api';

const { installUpdate, relaunch } = vi.hoisted(() => {
  return {
    installUpdate: vi.fn(() => Promise.resolve()),
    relaunch: vi.fn(),
  };
});

let shouldUpdate = true;
let installUpdateShouldThrow = false;

vi.mock('@tauri-apps/api/updater', () => {
  return {
    checkUpdate: () => {
      return Promise.resolve({
        shouldUpdate,
        manifest: {
          version: '1.0.0',
        },
      });
    },
    installUpdate: () => {
      if (installUpdateShouldThrow) {
        return Promise.reject(new Error('Update reject'));
      }

      installUpdate();
    },
  };
});

vi.mock('@tauri-apps/api/process', () => {
  return {
    relaunch,
  };
});

beforeEach(() => {
  shouldUpdate = true;
  installUpdateShouldThrow = false;
});

describe('Update', () => {
  it('', async () => {
    const { calls, events } = mockApi();

    await u.handleUpdate();

    expect(installUpdate).toHaveBeenCalledOnce();
    expect(relaunch).toHaveBeenCalledOnce();

    assert.isTrue(u.updateDownloading.value);
    assert.isUndefined(u.updateAvailable.value);
    assert.lengthOf(calls, 1);
    assert.isTrue(calls.has('askDialog'));
    assert.lengthOf(events.emits, 0);
    assert.lengthOf(events.listeners, 0);
  });

  it('Returns if update unavailable', async () => {
    const { calls } = mockApi();

    shouldUpdate = false;

    await u.handleUpdate();

    expect(installUpdate).not.toHaveBeenCalled();

    assert.lengthOf(calls, 0);
  });

  it('Returns if version has been seen', async () => {
    const { calls } = mockApi();

    localStorage.setItem('update-seen', '1.0.0');

    await u.handleUpdate();

    expect(installUpdate).not.toHaveBeenCalled();

    assert.lengthOf(calls, 0);
  });

  it("Asks if user wants to update and sets seen version if they don't", async () => {
    const { calls } = mockApi({
      api: {
        resValue: {
          askDialog: [false],
        },
      },
    });

    await u.handleUpdate();

    expect(installUpdate).not.toHaveBeenCalled();

    assert.lengthOf(calls, 1);
    assert.isTrue(calls.has('askDialog'));
    assert.deepEqual(calls[0].calledWith, {
      message: 'A new version of NoteBoi is available.\nDo you want to update now?',
      title: 'Update available: v1.0.0',
      type: undefined,
    });
    assert.strictEqual(localStorage.getItem('update-seen'), '1.0.0');
  });

  it("Catches error and doesn't retry", async () => {
    const { calls } = mockApi({
      api: {
        resValue: {
          askDialog: [false],
        },
      },
    });

    installUpdateShouldThrow = true;

    await u.updateAndRelaunch();

    assert.lengthOf(calls, 1);
    assert.isTrue(calls.has('askDialog'));
    assert.deepEqual(calls[0].calledWith, {
      message: 'Try again?',
      title: 'Unable to install update',
      type: 'error',
    });
    assert.isFalse(u.updateDownloading.value);
  });

  it('Catches error and retries', async () => {
    const { calls } = mockApi({
      api: {
        resValue: {
          askDialog: [true, false],
        },
      },
    });

    installUpdateShouldThrow = true;

    await u.updateAndRelaunch();

    assert.isFalse(u.updateDownloading.value);
    assert.lengthOf(calls, 2);
    assert.isTrue(calls.has('askDialog', 2));
  });
});
