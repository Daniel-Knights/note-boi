import { Endpoint, EndpointPayloads } from '../constant';
import { ParsedResponse } from '../store/sync';
import { isDev, tauriInvoke } from '../utils';

export class FetchBuilder<
  E extends Endpoint = Endpoint,
  R = EndpointPayloads[E]['response'],
> {
  #endpoint;
  #init: RequestInit = {};
  // Only `fetch` can be async, other methods need to cache promises here
  #promises: Promise<unknown>[] = [];
  #username?: string;
  #serverUrl = isDev()
    ? 'http://localhost:8000'
    : 'https://note-boi-server-1098279308841.europe-west2.run.app';

  constructor(e: E) {
    this.#endpoint = e;
  }

  method(m: 'PUT' | 'POST') {
    this.#init.method = m;

    return this;
  }

  headers(h: Record<string, string>) {
    this.#init.headers = {
      ...this.#init.headers,
      ...h,
    };

    return this;
  }

  body(b: EndpointPayloads[E]['payload']) {
    this.#init.body = JSON.stringify(b);

    return this;
  }

  /** Gets access token and adds auth headers */
  withAuth(username: string) {
    const tokenPromise = tauriInvoke('get_access_token', { username }).then((token) => {
      this.#init.headers = {
        ...this.#init.headers,
        'X-Username': username,
        Authorization: `Bearer ${token}`,
      };
    });

    this.#promises.push(tokenPromise);
    this.#username = username;
    this.#init.credentials = 'same-origin';

    return this;
  }

  async fetch(): Promise<ParsedResponse<R> | ParsedResponse<{ error: string }>> {
    await Promise.all(this.#promises);

    const res = await fetch(`${this.#serverUrl}/api${this.#endpoint}`, {
      ...this.#init,
      headers: {
        'Content-Type': 'application/json',
        'Content-Security-Policy': `default-src 'self'; connect-src ${this.#serverUrl};`,
        ...this.#init.headers,
      },
    });

    const contentType = res.headers.get('content-type');

    const body =
      res.body !== null && contentType?.includes('application/json')
        ? await res.json()
        : {};

    // TBR: Use secure cookies - https://github.com/tauri-apps/wry/issues/444
    if (body.access_token && this.#username) {
      await tauriInvoke('set_access_token', {
        username: this.#username,
        accessToken: body.access_token,
      });
    }

    return {
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      data: body,
    };
  }
}
