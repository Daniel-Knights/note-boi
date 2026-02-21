import { DOMWrapper, VueWrapper } from '@vue/test-utils';

const formatTestId = (id: string) => `[data-test-id="${id}"]`;

export function getByTestId<T extends Node>(
  wrapper: VueWrapper<any> | Omit<DOMWrapper<Node>, 'exists'>, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string
): Omit<DOMWrapper<T>, 'exists'> {
  return wrapper.get<T>(formatTestId(id));
}

export function findByTestId<T extends Element>(
  wrapper: VueWrapper<any> | Omit<DOMWrapper<Node>, 'exists'>, // eslint-disable-line @typescript-eslint/no-explicit-any
  id: string
): DOMWrapper<T> {
  return wrapper.find<T>(formatTestId(id));
}

/**
 * @returns a `div` element with an `id` of `app`.
 */
export function getAppDiv() {
  const appDiv = document.createElement('div');

  appDiv.id = 'app';

  return appDiv;
}

/**
 * Returns options to be used when mounting a component that uses `Teleport`.
 *
 * @param appDiv use {@link getAppDiv}
 * @returns options to be passed to `mount`
 */
export function getTeleportMountOptions(appDiv: HTMLElement) {
  return {
    attachTo: appDiv,
    global: {
      stubs: { teleport: true },
    },
  };
}

/**
 * Creates a mock MediaQueryList object for testing.
 * Includes a `trigger` method to simulate media query changes.
 */
export function createMediaQueryListMock(matches = false) {
  type MediaQueryListener = (ev: MediaQueryListEvent) => void;
  const listeners = new Set<MediaQueryListener>();

  return {
    matches,
    addEventListener: (_event: string, listener: MediaQueryListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_event: string, listener: MediaQueryListener) => {
      listeners.delete(listener);
    },
    trigger: (newMatches: boolean) => {
      const event = { matches: newMatches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}
