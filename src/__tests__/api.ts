import { mockIPC } from '@tauri-apps/api/mocks';
import { Update } from '@tauri-apps/plugin-updater';

import * as n from '../store/note';
import * as s from '../store/sync';
import pkg from '../../package.json';
import {
  Endpoint,
  EndpointPayloads,
  ENDPOINTS,
  TAURI_COMMANDS,
  TauriCommand,
  TauriCommandPayloads,
} from '../constant';
import { EncryptedNote } from '../store/sync/encryptor';
import { hasKeys } from '../utils';

import localNotes from './notes.json';
import { copyObjArr, isEncryptedNote, isNote, resolveImmediate } from './utils';

export const mockDb: {
  users: Record<string, string>;
  encryptedNotes: EncryptedNote[];
} = {
  users: {
    d: '1',
  },
  encryptedNotes: undefined as unknown as EncryptedNote[],
};

/**
 * Mocks the full API and returns results for each call made, along with
 * an array of all created promises.
 *
 * To clear results, use {@link clearMockApiResults}.
 *
 * Values can be passed to mock specific res values for `request`,
 * `invoke`, and `tauriApi`. Array order corresponds to the res value
 * for each call from left to right.
 *
 * @example
 * ```ts
 * const { calls, promises } = mockApi({
 *   tauriApi: {
 *     resValue: {
 *       // First call will answer true, second will answer false
 *       askDialog: [true, false],
 *     },
 *   },
 * });
 * ```
 *
 * Errors can also be mocked for `request` and `invoke`:
 *
 * @example
 * ```ts
 * const { calls } = mockApi({
 *   request: {
 *     error: {
 *       endpoint: '/login'
 *     },
 *   },
 * });
 * ```
 */
export function mockApi(
  options: {
    request?: {
      resValue?: RequestResValue;
      error?: {
        endpoint: Endpoint;
        status?: number;
      };
    };
    invoke?: {
      resValue?: InvokeResValue;
      error?: TauriCommand;
    };
    tauriApi?: {
      resValue?: TauriApiResValue;
    };
  } = {}
): {
  calls: ApiCalls;
  promises: Promise<unknown>[];
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

  function parseCallResult(callType: Exclude<keyof ApiCalls, 'size'>, call: Call | void) {
    if (!call) return;

    calls[callType].push(call);
    calls.size += 1;

    if (call.promise) {
      promises.push(call.promise);
    }

    return call.promise;
  }

  // Request
  global.fetch = (url, fetchOptions) => {
    const reqCall = mockRequest(url.toString(), fetchOptions!, options.request);

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
      const listenerCall = mockTauriListener(args as ListenArgs);

      return parseCallResult('listeners', listenerCall);
    }

    // Invoke
    if (TAURI_COMMANDS.includes(callId as TauriCommand)) {
      const invokeCall = mockTauriInvoke(
        callId,
        args as Record<string, unknown>,
        options.invoke
      );

      return parseCallResult('invoke', invokeCall);
    }

    // Tauri API
    const tauriApiCall = mockTauriApi(
      callId,
      args as AskDialogArgs | OpenDialogArgs,
      options.tauriApi
    );

    if (tauriApiCall) {
      return parseCallResult('tauriApi', tauriApiCall);
    }
  });

  return {
    calls,
    promises,
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

// Internals

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

/** Mocks requests to the server. */
function mockRequest(
  url: string,
  fetchOptions: RequestInit,
  options: {
    resValue?: RequestResValue;
    error?: {
      endpoint: Endpoint;
      status?: number;
    };
  } = {}
): Call<void | Response> {
  if (!s.syncState.isLoading) {
    assert.fail('Loading state not set');
  }

  const endpoint = url.split(/\/api(?=\/)/)[1] as Endpoint;
  const reqPayload: { notes?: n.Note[] } = JSON.parse(fetchOptions.body!.toString());

  if (!ENDPOINTS.includes(endpoint)) {
    assert.fail(`Invalid endpoint: ${endpoint}`);
  }

  if (options.error?.endpoint === endpoint) {
    return {
      name: endpoint,
      promise: resolveImmediate(
        new Response(JSON.stringify({ error: 'Server error' }), {
          status: options.error.status || 500,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ),
    };
  }

  const resData: {
    notes?: n.Note[] | EncryptedNote[];
    error?: string;
  } = {};

  let httpStatus = 200;

  switch (endpoint) {
    case '/signup':
      if (!hasKeys(reqPayload, ['notes', 'username', 'password'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        reqPayload.notes?.some((nt) => !isEncryptedNote(nt)) ||
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.password !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (mockDb.users[reqPayload.username]) {
        resData.error = 'User already exists';
        httpStatus = 409;
      } else {
        mockDb.users[reqPayload.username] = reqPayload.password;
        httpStatus = 201;
      }

      break;
    case '/login':
      if (!hasKeys(reqPayload, ['username', 'password'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.password !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[reqPayload.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (reqPayload.password !== mockDb.users[reqPayload.username]) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else {
        const resValue = options.resValue?.['/login']?.shift();

        resData.notes = resValue?.notes || [];
      }

      break;
    case '/logout':
      if (!mockDb.users[s.syncState.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        httpStatus = 204;
      }

      break;
    case '/notes/pull':
      // Pull
      if (!mockDb.users[s.syncState.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        const resValue = options.resValue?.['/notes/pull']?.shift();

        resData.notes = resValue?.notes || [];
      }

      break;
    case '/notes/push':
      if (!hasKeys(reqPayload, ['notes'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (reqPayload.notes?.some((nt) => !isEncryptedNote(nt))) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[s.syncState.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        httpStatus = 204;
      }

      break;
    case '/account/password/change':
      if (!hasKeys(reqPayload, ['current_password', 'new_password'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.current_password !== 'string' ||
        typeof reqPayload.new_password !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[s.syncState.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (reqPayload.current_password !== mockDb.users[s.syncState.username]) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      }

      break;
    case '/account/delete':
      if (!mockDb.users[s.syncState.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        delete mockDb.users[s.syncState.username];
        httpStatus = 204;
      }
  }

  return {
    name: endpoint,
    promise: resolveImmediate(
      new Response(httpStatus === 204 ? null : JSON.stringify(resData), {
        status: httpStatus,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ),
  };
}

/** Mocks Tauri `invoke` calls. */
function mockTauriInvoke(
  cmd: string,
  args: Record<string, unknown>,
  options: { resValue?: InvokeResValue; error?: string } = {}
): Call<n.Note[] | void> | void {
  if (options.error === cmd) {
    return {
      name: cmd,
      calledWith: args,
      promise: resolveImmediate(undefined),
    };
  }

  let resData: n.Note[] = [];

  switch (cmd) {
    case 'get_all_notes': {
      const resValue = options.resValue?.get_all_notes?.shift();

      resData = resValue || copyObjArr(localNotes);

      break;
    }
    case 'new_note':
      if (!hasKeys(args, ['note'])) {
        assert.fail('Missing note');
      } else if (!isNote(args.note)) {
        assert.fail('Invalid note');
      }

      break;
    case 'edit_note':
      if (!hasKeys(args, ['note'])) {
        assert.fail('Missing note');
      } else if (!isNote(args.note)) {
        assert.fail('Invalid note');
      }

      break;
    case 'delete_note':
      if (!hasKeys(args, ['id'])) {
        assert.fail('Missing id');
      } else if (typeof args.id !== 'string') {
        assert.fail('Invalid id');
      }

      break;
    case 'sync_local_notes':
      if (!hasKeys(args, ['notes'])) {
        assert.fail('Missing notes');
      } else if (!Array.isArray(args.notes) || args.notes.some((nt) => !isNote(nt))) {
        assert.fail('Invalid notes');
      }

      break;
    case 'export_notes':
      if (!hasKeys(args, ['saveDir', 'notes'])) {
        assert.fail('Missing saveDir or notes');
      } else if (
        typeof args.saveDir !== 'string' ||
        !Array.isArray(args.notes) ||
        args.notes.some((nt) => !isNote(nt))
      ) {
        assert.fail('Invalid saveDir or notes');
      }

      break;
  }

  return {
    name: cmd,
    calledWith: args,
    promise: resolveImmediate(resData),
  };
}

/** Mocks calls to the Tauri API. */
function mockTauriApi(
  callId: string,
  args: AskDialogArgs | OpenDialogArgs,
  options: { resValue?: TauriApiResValue } = {}
) {
  let resData: TauriApiResValue[string][number] | undefined;
  let calledWith;

  switch (callId) {
    case 'plugin:app|version':
      resData = pkg.version;

      break;
    case 'plugin:dialog|ask': {
      const askDialogArgs = args as AskDialogArgs;

      const resValue = options.resValue?.askDialog?.[0];

      if (resValue) {
        options.resValue?.askDialog?.shift();
      }

      resData = resValue === undefined ? true : resValue;
      calledWith = {
        message: askDialogArgs.message,
        title: askDialogArgs.title,
        kind: askDialogArgs.kind,
      };

      break;
    }
    case 'plugin:dialog|open': {
      const openDialogArgs = args as OpenDialogArgs;
      const resValue = options.resValue?.openDialog?.[0];

      if (resValue) {
        options.resValue?.openDialog?.shift();
      }

      resData = resValue === undefined ? 'C:\\path' : resValue;
      calledWith = {
        directory: openDialogArgs.options.directory,
        multiple: openDialogArgs.options.multiple,
        recursive: openDialogArgs.options.recursive,
        title: openDialogArgs.options.title,
      };

      break;
    }
  }

  return {
    name: callId,
    calledWith,
    promise: resolveImmediate(resData),
  };
}

/** Mocks Tauri `event.emit` calls. */
function mockTauriEmit(args: EmitArgs): Call | void {
  return {
    name: args.event,
    calledWith: args.payload,
  };
}

/** Mocks Tauri `event.listen` calls. */
function mockTauriListener(args: ListenArgs): Call | void {
  return {
    name: args.event,
  };
}

// Types

type AskDialogArgs = {
  message: string;
  kind?: 'error' | 'info' | 'warning';
  title?: string;
  yesButtonLabel?: string;
  noButtonLabel?: string;
};

type OpenDialogArgs = {
  options: {
    directory?: boolean;
    multiple?: boolean;
    recursive?: boolean;
    title?: string;
  };
};

type ListenArgs = {
  event: string;
  handler: number;
  target: {
    kind: string;
  };
};

type EmitArgs = {
  event: string;
  payload?: unknown;
};

type RequestResValue = {
  [E in keyof EndpointPayloads]?: EndpointPayloads[E]['response'][];
};
type InvokeResValue = {
  [C in keyof TauriCommandPayloads]?: TauriCommandPayloads[C]['response'][];
};
type TauriApiResValue = Record<string, unknown[]> & {
  askDialog?: boolean[];
  openDialog?: string[];
  checkUpdate?: ConstructorParameters<typeof Update>[0][];
};

type Call<T = unknown> = {
  name: string;
  calledWith?: unknown;
  promise?: Promise<T>;
};

type ApiCallType = 'request' | 'invoke' | 'tauriApi' | 'emits' | 'listeners';
type ApiCalls = { [T in ApiCallType]: Calls } & { size: number };
