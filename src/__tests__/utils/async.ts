import * as s from '../../store/sync';
import { mockApi } from '../api';

/** Returns a promise that resolves after `setImmediate`. */
export function resolveImmediate<T>(val?: T): Promise<T | void> {
  return new Promise((res) => {
    setImmediate(() => res(val));
  });
}

/** Returns a promise that resolves after `time`. */
export function wait(time: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, time);
  });
}

/** Waits until `cond` is `true`. */
export function waitUntil<T>(condFn: () => T): Promise<T> {
  return vi.waitUntil(condFn, { timeout: 10000 });
}

/**
 * Uses fake timers and waits for `autoSync` to run.
 * Specifically intended for `n.editNote` and `n.deleteNote`.
 */
export async function waitForAutoSync(
  cb: () => void | Promise<void>,
  calls: ReturnType<typeof mockApi>['calls']
) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

  await cb();

  await waitUntil(() => calls.invoke.has('edit_note') || calls.invoke.has('delete_note'));
  await resolveImmediate(); // Defer to `.then` and `autoSync`

  vi.runAllTimers();

  await waitUntil(() => !s.syncState.loadingCount);

  vi.useRealTimers();
}
