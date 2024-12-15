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
