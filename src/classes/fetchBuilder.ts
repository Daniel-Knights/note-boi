import { ParsedResponse } from '../api';
import { Endpoint, EndpointPayloads } from '../constant';

import { TokenStore } from './tokenStore';

export class FetchBuilder<
  E extends Endpoint = Endpoint,
  R = EndpointPayloads[E]['response'],
> {
  #endpoint;
  #init: RequestInit = {};

  static serverUrl = process.env.SERVER_URL;
  static defaultHeaders = {
    'Content-Type': 'application/json',
    'Content-Security-Policy': `default-src 'self'; connect-src ${FetchBuilder.serverUrl};`,
  };

  constructor(e: E) {
    this.#endpoint = e;
  }

  method(m: 'GET' | 'PUT' | 'POST' | 'DELETE') {
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
      await TokenStore.setAccessToken(username, body.access_token);
    } else if (body.access_token) {
      console.error(`Unexpected access_token for endpoint: ${this.#endpoint}`);
    }

    return {
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      data: body,
    };
  }
}
