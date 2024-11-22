import * as dialog from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { ref } from 'vue';

import { STORAGE_KEYS } from '../constant';

export const UPDATE_STRATEGIES = ['auto', 'manual'] as const;

export type UpdateStrategy = (typeof UPDATE_STRATEGIES)[number];

export const update = ref<Update>();
export const updateDownloading = ref<boolean>(false);
export const updateStrategy = ref<'auto' | 'manual'>(
  (localStorage.getItem(STORAGE_KEYS.UPDATE_STRATEGY) as 'auto' | 'manual') ?? 'manual'
);

export async function handleUpdate(): Promise<void> {
  const checkResult = await check();
  if (!checkResult?.available) return;

  update.value = checkResult;

  if (updateStrategy.value === 'auto') {
    return updateAndRelaunch();
  }

  const newVersion = checkResult.version;

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

  return updateAndRelaunch();
}

export async function updateAndRelaunch(): Promise<void> {
  if (!update.value) return;

  updateDownloading.value = true;

  try {
    await update.value?.downloadAndInstall();

    update.value = undefined;

    await relaunch();
  } catch (error) {
    console.error(error);

    const shouldRetry = await dialog.ask('Try again?', {
      title: 'Unable to install update',
      kind: 'error',
    });

    if (shouldRetry) {
      await updateAndRelaunch();
    } else {
      update.value = undefined;
      updateDownloading.value = false;
    }
  }
}

export function setUpdateStrategy(strategy: 'auto' | 'manual'): void {
  updateStrategy.value = strategy;

  localStorage.setItem(STORAGE_KEYS.UPDATE_STRATEGY, strategy);
}
