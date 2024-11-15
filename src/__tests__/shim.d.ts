// TBR: TODO
module '@tauri-apps/api/mocks' {
  import { InvokeArgs } from '@tauri-apps/api/core';

  export function mockIPC(cb: (callId: string, args?: InvokeArgs) => unknown): void;
}

export {};
