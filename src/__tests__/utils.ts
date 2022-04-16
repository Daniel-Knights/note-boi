import { randomFillSync } from 'crypto';

// jsdom doesn't come with a WebCrypto implementation
export function setCrypto(): void {
  window.crypto = {
    // @ts-expect-error strict typing unnecessary here
    getRandomValues: (array) => randomFillSync(array),
  };
}

export function mockPromise<T>(resValue?: T): Promise<T | void> {
  return new Promise((res) => {
    res(resValue);
  });
}
