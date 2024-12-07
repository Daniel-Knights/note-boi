import { Endpoint, EndpointPayloads } from '../constant';
import { ParsedResponse } from '../store/sync';
import { isDev, tauriInvoke } from '../utils';

export class FetchBuilder<
  E extends Endpoint = Endpoint,
  R = EndpointPayloads[E]['response'],
> {
  #endpoint;
  #init: RequestInit = {};

  constructor(e: E) {
    this.#endpoint = e;
  }

  static serverUrl =
    isDev() || process.env.NODE_ENV === 'test'
      ? 'http://localhost:8000'
      : 'https://note-boi-server-1098279308841.europe-west2.run.app';

  static defaultHeaders = {
    'Content-Type': 'application/json',
    'Content-Security-Policy': `default-src 'self'; connect-src ${FetchBuilder.serverUrl};`,
  };

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

  /** Adds auth headers */
  withAuth(username: string, token: string) {
    this.#init.headers = {
      ...this.#init.headers,
      'X-Username': username,
      Authorization: `Bearer ${token}`,
    };

    this.#init.credentials = 'same-origin';

    return this;
  }

  async fetch(
    username?: string
  ): Promise<ParsedResponse<R> | ParsedResponse<{ error: string }>> {
    const res = await fetch(`${FetchBuilder.serverUrl}/api${this.#endpoint}`, {
      ...this.#init,
      headers: {
        ...FetchBuilder.defaultHeaders,
        ...this.#init.headers,
      },
    });

    const contentType = res.headers.get('content-type');

    const body =
      res.body !== null && contentType?.includes('application/json')
        ? await res.json()
        : {};

    // TBR: Use secure cookies - https://github.com/tauri-apps/wry/issues/444
    if (body.access_token && username) {
      await tauriInvoke('set_access_token', {
        username,
        accessToken: body.access_token,
      });
    } else if (body.access_token) {
      console.error('Unexpected access_token');
    }

    return {
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      data: body,
    };
  }
}
