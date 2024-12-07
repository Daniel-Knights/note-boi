import { Endpoint, EndpointPayloads } from '../../../constant';

export type ParsedResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
};

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
