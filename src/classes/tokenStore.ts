import { isWeb, tauriInvoke } from '../utils';

import { Storage } from './storage';

/**
 * Adapter class for storing tokens:
 * - `localStorage` for web environments
 * - OS credential store for desktop environments
 */
export class TokenStore {
  static getAccessToken(username: string): Promise<string | void> {
    if (isWeb()) {
      return Promise.resolve(Storage.get('ACCESS_TOKEN') ?? undefined);
    }

    return tauriInvoke('get_access_token', { username }, { rethrowErrors: true });
  }

  static setAccessToken(username: string, accessToken: string): Promise<void> {
    if (isWeb()) {
      Storage.set('ACCESS_TOKEN', accessToken);

      return Promise.resolve();
    }

    return tauriInvoke('set_access_token', { username, accessToken });
  }

  static deleteAccessToken(username: string): Promise<void> {
    if (isWeb()) {
      Storage.remove('ACCESS_TOKEN');

      return Promise.resolve();
    }

    return tauriInvoke('delete_access_token', { username });
  }
}
