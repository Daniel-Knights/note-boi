import * as tauriDialog from '@tauri-apps/plugin-dialog';

import { isDesktop } from '../utils';

type DialogKind = 'info' | 'warning' | 'error';

export class Dialog {
  static ask(
    message: string,
    options?: {
      title?: string;
      kind?: DialogKind;
    }
  ): Promise<boolean> {
    if (isDesktop()) {
      return tauriDialog.ask(message, options);
    }

    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(message));
  }

  static async message(
    message: string,
    options?: { kind?: DialogKind; title?: string }
  ): Promise<void> {
    if (isDesktop()) {
      await tauriDialog.message(message, options);

      return;
    }

    // eslint-disable-next-line no-alert
    return Promise.resolve(window.alert(message));
  }
}
