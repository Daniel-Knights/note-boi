import { dialog } from '@tauri-apps/api';
import { relaunch } from '@tauri-apps/api/process';
import { checkUpdate, installUpdate, UpdateResult } from '@tauri-apps/api/updater';
import { ref } from 'vue';

export const updateAvailable = ref<UpdateResult>();
export const updateDownloading = ref<boolean>(false);

export async function updateAndRelaunch(): Promise<void> {
  updateDownloading.value = true;

  try {
    await installUpdate();

    updateAvailable.value = undefined;

    await relaunch();
  } catch (error) {
    console.error(error);

    const shouldRetry = await dialog.ask('Try again?', {
      title: 'Unable to install update',
      type: 'error',
    });

    if (shouldRetry) {
      updateAndRelaunch();
    } else {
      updateDownloading.value = false;
    }
  }
}

export async function handleUpdate(): Promise<void> {
  updateAvailable.value = await checkUpdate();
  if (!updateAvailable.value.shouldUpdate) return;

  const newVersion = updateAvailable.value.manifest?.version;
  if (!newVersion) return;

  // Check if the user has already been notified
  const seenVersion = localStorage.getItem('update-seen');
  if (seenVersion === newVersion) return;

  const shouldInstall = await dialog.ask(
    'A new version of NoteBoi is available.\nDo you want to update now?',
    `Update available: v${newVersion}`
  );
  if (!shouldInstall) {
    localStorage.setItem('update-seen', newVersion);
    return;
  }

  updateAndRelaunch();
}
