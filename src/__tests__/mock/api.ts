import { mockIPC } from '@tauri-apps/api/mocks';

import { Endpoint, TAURI_COMMANDS, TauriCommand } from '../../constant';
import { normaliseCall } from '../utils';

import { mockRequest, RequestResValue } from './request';
import {
  AskDialogArgs,
  EmitArgs,
  InvokeResValue,
  ListenArgs,
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

  // Request
  global.fetch = (url, fetchOptions) => {
    const endpoint = url.toString().split(/\/api(?=\/)/)[1] as Endpoint;

    return executeMockCall<Response>('request', endpoint, () =>
      mockRequest(endpoint, fetchOptions!, {
        error: errorValues.request,
        resValue: resValues.request,
      })
    );
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
      return executeMockCall('invoke', callId, () =>
        mockTauriInvoke(callId, args as Record<string, unknown>, {
          error: errorValues.invoke,
          resValue: resValues.invoke,
        })
      );
    }

    // Tauri API
    if (callId === 'plugin:log|log') return;

    return executeMockCall('tauriApi', callId, () =>
      mockTauriApi(callId, args as AskDialogArgs | OpenDialogArgs, {
        error: errorValues.tauriApi,
        resValue: resValues.tauriApi,
      })
    );
  });

  //// Helpers

  function parseCallResult(callType: ApiCallType, call: Call) {
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

  /**
   * Executes a mock API call and parses the result.
   *
   * Executes the provided mock function within a try/finally block to ensure
   * the result is always parsed, even if the mock function throws.
   */
  function executeMockCall<T = unknown>(
    callType: ApiCallType,
    name: string,
    mockFn: () => Record<string, unknown> | undefined
  ) {
    let mockCall: ReturnType<typeof mockFn>;
    let result: ReturnType<typeof parseCallResult>;

    try {
      mockCall = mockFn();
    } finally {
      result = parseCallResult(callType, {
        name,
        ...mockCall,
      });
    }

    return result as Promise<T>;
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
