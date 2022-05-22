import { UpdateResult, checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';
import { dialog } from '@tauri-apps/api';
import { ref } from 'vue';

export const updateAvailable = ref<UpdateResult>();

export async function updateAndRelaunch(): Promise<void> {
  await installUpdate();

  updateAvailable.value = undefined;

  relaunch();
}

export async function handleUpdate(): Promise<void> {
  updateAvailable.value = await checkUpdate();
  if (!updateAvailable.value.shouldUpdate) return;

  const shouldInstall = await dialog.ask(
    'A new version of NoteBoi is available.\nDo you want to update now?',
    'Update available'
  );
  if (!shouldInstall) return;

  updateAndRelaunch();
}
