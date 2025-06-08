/** Mocks Tauri `event.emit` calls. */
export function mockTauriEmit(args: EmitArgs) {
  return {
    name: args.event,
    calledWith: args.payload,
  };
}

//// Types

export type EmitArgs = {
  event: string;
  payload?: Record<string, unknown>;
};
