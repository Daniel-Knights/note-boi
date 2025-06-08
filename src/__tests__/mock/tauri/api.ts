import { Update } from '@tauri-apps/plugin-updater';

import pkg from '../../../../package.json';
import { resolveImmediate } from '../../utils';

/** Mocks calls to the Tauri API. */
export function mockTauriApi(
  callId: string,
  args: AskDialogArgs | OpenDialogArgs,
  options: { resValue?: TauriApiResValue; error?: string } = {}
) {
  if (options.error === callId) {
    throw new Error('Mock Tauri API error');
  }

  let resData: TauriApiResValue[string][number] | undefined;
  let calledWith;

  switch (callId) {
    case 'plugin:app|version':
      resData = pkg.version;

      break;
    case 'plugin:dialog|ask': {
      const askDialogArgs = args as AskDialogArgs;
      const resValue = options.resValue?.askDialog?.shift();

      resData = resValue === undefined ? true : resValue;
      calledWith = {
        message: askDialogArgs.message,
        title: askDialogArgs.title,
        kind: askDialogArgs.kind,
      };

      break;
    }
    case 'plugin:dialog|open': {
      const openDialogArgs = args as OpenDialogArgs;
      const resValue = options.resValue?.openDialog?.shift();

      resData = resValue === undefined ? 'C:\\path' : resValue;
      calledWith = {
        directory: openDialogArgs.options.directory,
        multiple: openDialogArgs.options.multiple,
        recursive: openDialogArgs.options.recursive,
        title: openDialogArgs.options.title,
      };

      break;
    }
    case 'plugin:dialog|message': {
      const messageDialogArgs = args as MessageDialogArgs;

      calledWith = {
        message: messageDialogArgs.message,
        okLabel: messageDialogArgs.okLabel,
        title: messageDialogArgs.title,
        kind: messageDialogArgs.kind,
      };

      break;
    }
    case 'plugin:updater|check': {
      const resValue = options.resValue?.checkUpdate?.shift();

      const defaultResValue = {
        rid: 1,
        available: true,
        version: '1.0.0',
        currentVersion: '0.9.0',
      } satisfies NonNullable<typeof resValue>;

      resData = {
        ...defaultResValue,
        ...resValue,
      };

      break;
    }
    case 'plugin:updater|download_and_install': {
      const resValue = options.resValue?.downloadAndInstallUpdate?.shift();

      resData = resValue;

      break;
    }
  }

  return {
    name: callId,
    calledWith,
    promise: resolveImmediate(resData),
  };
}

//// Types

export type TauriApiResValue = Record<string, unknown[]> & {
  askDialog?: boolean[];
  openDialog?: string[];
  checkUpdate?: Partial<ConstructorParameters<typeof Update>[0]>[];
  downloadAndInstallUpdate?: ReturnType<Update['downloadAndInstall']>[];
};

export type AskDialogArgs = {
  message: string;
  kind?: 'error' | 'info' | 'warning';
  title?: string;
  yesButtonLabel?: string;
  noButtonLabel?: string;
};

export type OpenDialogArgs = {
  options: {
    directory?: boolean;
    multiple?: boolean;
    recursive?: boolean;
    title?: string;
  };
};

export type MessageDialogArgs = {
  message: string;
  okLabel?: string;
  title?: string;
  kind?: 'error' | 'info' | 'warning';
};
