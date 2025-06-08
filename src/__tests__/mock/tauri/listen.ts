/** Mocks Tauri `event.listen` calls. */
export function mockTauriListen(args: ListenArgs) {
  return {
    name: args.event,
  };
}

//// Types

export type ListenArgs = {
  event: string;
  handler: number;
  target: {
    kind: string;
  };
};
