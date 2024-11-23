import * as dialog from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { reactive } from 'vue';

import { STORAGE_KEYS } from '../constant';

export const UPDATE_STRATEGIES = ['auto', 'manual'] as const;

export type UpdateStrategy = (typeof UPDATE_STRATEGIES)[number];

export const updateState = reactive({
  isAvailable: false,
  isDownloading: false,
  strategy:
    (localStorage.getItem(STORAGE_KEYS.UPDATE_STRATEGY) as 'auto' | 'manual') ?? 'manual',
});

export async function handleUpdate(): Promise<void> {
  const update = await check();
  if (!update?.available) return;

  updateState.isAvailable = true;

  if (updateState.strategy === 'auto') {
    return updateAndRelaunch(update);
  }

  const newVersion = update.version;

  // Check if the user has already been notified
  const seenVersion = localStorage.getItem(STORAGE_KEYS.UPDATE_SEEN);
  if (seenVersion === newVersion) return;

  const shouldInstall = await dialog.ask(
    'A new version of NoteBoi is available.\nDo you want to update now?',
    `Update available: v${newVersion}`
  );
  if (!shouldInstall) {
    localStorage.setItem(STORAGE_KEYS.UPDATE_SEEN, newVersion);

    return;
  }

  return updateAndRelaunch(update);
}

export async function updateAndRelaunch(update: Update): Promise<void> {
  updateState.isDownloading = true;

  try {
    await update.downloadAndInstall();
    await relaunch();
  } catch (error) {
    console.error(error);

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

  localStorage.setItem(STORAGE_KEYS.UPDATE_STRATEGY, strategy);
}
