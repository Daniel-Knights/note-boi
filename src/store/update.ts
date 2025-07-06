import * as dialog from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { reactive } from 'vue';

import { Storage } from '../classes';

export const updateState = reactive({
  isAvailable: false,
  isDownloading: false,
  strategy: Storage.get('UPDATE_STRATEGY') ?? 'manual',
});

export async function handleUpdate(): Promise<void> {
  console.log('Checking for updates...');

  const update = await check();
  if (!update) {
    console.log('No updates available');

    return;
  }

  console.log('Update available:', update.version);

  updateState.isAvailable = true;

  if (updateState.strategy === 'auto') {
    return updateAndRelaunch(update);
  }

  const newVersion = update.version;

  // Check if the user has already been notified
  const seenVersion = Storage.get('UPDATE_SEEN');
  if (seenVersion === newVersion) {
    console.log('Update already seen');

    return;
  }

  const shouldInstall = await dialog.ask(
    'A new version of NoteBoi is available.\nDo you want to update now?',
    `Update available: v${newVersion}`
  );

  if (!shouldInstall) {
    console.log('User chose not to update');

    Storage.set('UPDATE_SEEN', newVersion);

    return;
  }

  return updateAndRelaunch(update);
}

export async function updateAndRelaunch(update: Update): Promise<void> {
  updateState.isDownloading = true;

  console.log('Downloading and installing update');

  try {
    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.error('Failed to install update:', err);

    const shouldRetry = await dialog.ask('Try again?', {
      title: 'Unable to install update',
      kind: 'error',
    });

    if (shouldRetry) {
      await updateAndRelaunch(update);
    } else {
      updateState.isDownloading = false;
    }
  }
}

export function setUpdateStrategy(strategy: 'auto' | 'manual'): void {
  updateState.strategy = strategy;

  Storage.set('UPDATE_STRATEGY', strategy);
}
