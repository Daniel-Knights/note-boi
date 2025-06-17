import { mockIPC } from '@tauri-apps/api/mocks';

import { Endpoint, TAURI_COMMANDS, TauriCommand } from '../../constant';
import { normaliseCall } from '../utils';

import { mockRequest, RequestResValue } from './request';
import {
  AskDialogArgs,
  EmitArgs,
  InvokeResValue,
  ListenArgs,
  MessageDialogArgs,
  mockTauriApi,
  mockTauriEmit,
  mockTauriInvoke,
  mockTauriListen,
  OpenDialogArgs,
  TauriApiResValue,
} from './tauri';

export const allCalls: [ApiCallType, Call][] = [];

/**
 * Mocks the full API and returns results for each call made, along with an array of all created promises.
 *
 * To clear results, use {@link clearMockApiResults}.
 *
 * Values can be passed to mock specific res values. Array order corresponds to the res value for each call from left to right.
 *
 * @example
 * ```ts
 * const { calls, promises, setResValues } = mockApi();
 *
 * setResValues.tauriApi({
 *   // First call will answer true, second will answer false
 *   askDialog: [true, false],
 * });
 * ```
 *
 * Errors can also be mocked.
 *
 * @example
 * ```ts
 * const { calls, setErrorValue } = mockApi();
 *
 * setErrorValue.request({ endpoint: '/auth/login' });
 * ```
 */
export function mockApi(): {
  calls: ApiCalls;
  promises: Promise<unknown>[];
  /**
   * Sets res values for mocked APIs.
   * Values are resolved in the order they're defined and then removed from the queue.
   * Calling multiple times for the same call type will add to the queue.
   */
  setResValues: {
    request: (values: RequestResValue) => void;
    invoke: (values: InvokeResValue) => void;
    tauriApi: (values: TauriApiResValue) => void;
  };
  /**
   * Sets an error value for mocked APIs.
   * The error will be thrown when the API is called.
   * Calling multiple times for the same call type will overwrite the previous error.
   */
  setErrorValue: {
    request: (error: { endpoint: Endpoint; status?: number }) => void;
    invoke: (error: TauriCommand) => void;
    tauriApi: (error: string) => void;
  };
} {
  const calls = {
    request: new Calls(),
    invoke: new Calls(),
    tauriApi: new Calls(),
    emits: new Calls(),
    listeners: new Calls(),
    size: 0,
  } satisfies ApiCalls;

  const promises: Promise<unknown>[] = [];

  // Populated by tests via `setResValues`
  const resValues: {
    request?: RequestResValue;
    invoke?: InvokeResValue;
    tauriApi?: TauriApiResValue;
  } = {
    request: {},
    invoke: {},
    tauriApi: {},
  };

  // Populated by tests via `setErrorValues`
  const errorValues: {
    request?: { endpoint: Endpoint; status?: number };
    invoke?: TauriCommand;
    tauriApi?: string;
  } = {};

  function parseCallResult(callType: ApiCallType, call: Call | void) {
    if (!call) return;

    calls[callType].push(call);
    calls.size += 1;

    if (call.promise) {
      promises.push(call.promise);
    }

    // We normalise the call here, because it can contain references to objects that
    // are mutated later in the test, which would affect the snapshots.
    allCalls.push([callType, normaliseCall(call)]);

    return call.promise;
  }

  // Request
  global.fetch = (url, fetchOptions) => {
    const reqCall = mockRequest(url.toString(), fetchOptions!, {
      error: errorValues.request,
      resValue: resValues.request,
    });

    return parseCallResult('request', reqCall) as Promise<Response>;
  };

  mockIPC((callId, args) => {
    // Emit
    if (callId === 'plugin:event|emit') {
      const emitCall = mockTauriEmit(args as EmitArgs);

      return parseCallResult('emits', emitCall);
    }

    // Listen
    if (callId === 'plugin:event|listen') {
      const listenerCall = mockTauriListen(args as ListenArgs);

      return parseCallResult('listeners', listenerCall);
    }

    // Invoke
    if (TAURI_COMMANDS.includes(callId as TauriCommand)) {
      const invokeCall = mockTauriInvoke(callId, args as Record<string, unknown>, {
        error: errorValues.invoke,
        resValue: resValues.invoke,
      });

      return parseCallResult('invoke', invokeCall);
    }

    // Tauri API
    const tauriApiCall = mockTauriApi(
      callId,
      args as AskDialogArgs | OpenDialogArgs | MessageDialogArgs,
      {
        error: errorValues.tauriApi,
        resValue: resValues.tauriApi,
      }
    );

    if (tauriApiCall) {
      return parseCallResult('tauriApi', tauriApiCall);
    }
  });

  function setResValues(
    callType: 'request' | 'invoke' | 'tauriApi',
    values: Record<string, unknown[]>
  ) {
    Object.entries(values).forEach(([callName, resValue]) => {
      const resValuesForType = resValues[callType] as Record<string, unknown[]>;
      const existingResValues = resValuesForType[callName];

      if (existingResValues) {
        existingResValues.push(...resValue);
      } else {
        resValuesForType[callName] = resValue;
      }
    });
  }

  return {
    calls,
    promises,
    setResValues: {
      request: setResValues.bind(null, 'request'),
      invoke: setResValues.bind(null, 'invoke'),
      tauriApi: setResValues.bind(null, 'tauriApi'),
    },
    setErrorValue: {
      request: (error) => {
        errorValues.request = error;
      },
      invoke: (error) => {
        errorValues.invoke = error;
      },
      tauriApi: (error) => {
        errorValues.tauriApi = error;
      },
    },
  };
}

export function clearMockApiResults(results: {
  calls?: ApiCalls;
  promises?: Promise<unknown>[];
}): void {
  if (results.calls) {
    Object.values(results.calls).forEach((val) => {
      if (val instanceof Calls) {
        val.clear();
      }
    });

    results.calls.size = 0;
  }

  results.promises?.splice(0, results.promises.length);
}

//// Helpers

class Calls extends Array<Call> {
  has(name: string, count?: number): boolean {
    if (count) {
      return super.filter((c) => c.name === name).length === count;
    }

    return super.some((c) => c.name === name);
  }

  clear(): void {
    super.splice(0, this.length);
  }
}

//// Types

type ApiCallType = 'request' | 'invoke' | 'tauriApi' | 'emits' | 'listeners';
type ApiCalls = { [T in ApiCallType]: Calls } & { size: number };

export type Call<T = unknown> = {
  name: string;
  calledWith?: Record<string, unknown>;
  promise?: Promise<T>;
};
