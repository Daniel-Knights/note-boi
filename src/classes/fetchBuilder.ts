import { Endpoint, EndpointPayloads } from '../constant';
import { ParsedResponse } from '../store/sync';
import { isDev } from '../utils';

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
      : 'https://note-boi-server-v202-1098279308841.europe-west2.run.app';

  static defaultHeaders = {
    'Content-Type': 'application/json',
    'Content-Security-Policy': `default-src 'self'; connect-src ${FetchBuilder.serverUrl};`,
  };

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

  async fetch(): Promise<ParsedResponse<R> | ParsedResponse<{ error: string }>> {
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

    return {
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      data: body,
    };
  }
}
