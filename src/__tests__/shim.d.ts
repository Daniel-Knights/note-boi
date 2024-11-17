// TBR: https://github.com/tauri-apps/tauri/issues/11720
import { InvokeArgs } from '@tauri-apps/api/core';

module '@tauri-apps/api/mocks' {
  export function mockIPC(cb: (callId: string, args?: InvokeArgs) => unknown): void;
}

export {};
