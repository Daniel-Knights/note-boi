import * as dialog from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { ref } from 'vue';

export const update = ref<Update>();
export const updateDownloading = ref<boolean>(false);

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

// TODO: swap these functions
export async function handleUpdate(): Promise<void> {
  const checkResult = await check();
  if (!checkResult?.available) return;

  update.value = checkResult;

  const newVersion = checkResult.version;

  // Check if the user has already been notified
  const seenVersion = localStorage.getItem('update-seen');
  if (seenVersion === newVersion) {
    update.value = undefined;

    return;
  }

  const shouldInstall = await dialog.ask(
    'A new version of NoteBoi is available.\nDo you want to update now?',
    `Update available: v${newVersion}`
  );
  if (!shouldInstall) {
    localStorage.setItem('update-seen', newVersion);

    update.value = undefined;

    return;
  }

  updateAndRelaunch();
}
