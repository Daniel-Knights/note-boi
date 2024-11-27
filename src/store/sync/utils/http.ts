import { Endpoint, EndpointPayloads } from '../../../constant';
import { isDev } from '../../../utils';

export type ParsedResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
};

/** Wrapper for {@link fetch}. */
export async function fetchData<
  E extends Endpoint = Endpoint,
  R = EndpointPayloads[E]['response'],
>(
  endpoint: E,
  method: 'POST' | 'PUT',
  payload?: EndpointPayloads[E]['payload']
): Promise<ParsedResponse<R> | ParsedResponse<{ error: string }>> {
  const serverUrl = isDev()
    ? 'http://localhost:8000'
    : 'https://note-boi-server.herokuapp.com';

  const res = await fetch(`${serverUrl}/api${endpoint}`, {
    method,
    body: JSON.stringify(payload ?? {}),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Content-Security-Policy': `default-src: 'self'; connect-src ${serverUrl};`,
    },
  });

  const contentType = res.headers.get('content-type');

  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    data:
      res.body !== null && contentType?.includes('application/json')
        ? await res.json()
        : {},
  };
}

/** Parses an error response and returns a formatted message. */
export function parseErrorRes(res: ParsedResponse<{ error: string }>): string {
  const unknownErrorMessage = 'Unknown error, please try again';

  if (!res.data) return unknownErrorMessage;

  return typeof res.data.error === 'string' ? res.data.error : unknownErrorMessage;
}

export function resIsOk<T extends EndpointPayloads[Endpoint]['response']>(
  res: ParsedResponse<T> | ParsedResponse<{ error: string }> | void
): res is ParsedResponse<T> {
  return res?.ok === true;
}
