import { mockIPC } from '@tauri-apps/api/mocks';
import { Update } from '@tauri-apps/plugin-updater';

import * as n from '../store/note';
import * as s from '../store/sync';
import pkg from '../../package.json';
import { EncryptedNote } from '../classes';
import {
  Endpoint,
  EndpointPayloads,
  ENDPOINTS,
  TAURI_COMMANDS,
  TauriCommand,
  TauriCommandPayloads,
} from '../constant';
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

export const mockKeyring: Record<string, string> = {};
export const allCalls: [ApiCallType, Call][] = [];

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
      error?: string;
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

  function parseCallResult(callType: ApiCallType, call: Call | void) {
    if (!call) return;

    calls[callType].push(call);
    calls.size += 1;

    if (call.promise) {
      promises.push(call.promise);
    }

    allCalls.push([callType, call]);

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

function hasValidAuthHeaders(headers?: HeadersInit) {
  return (
    headers &&
    'Authorization' in headers &&
    'X-Username' in headers &&
    headers.Authorization.replace('Bearer ', '') === mockKeyring[headers['X-Username']]
  );
}

/** Mocks requests to the server. */
function mockRequest(
  url: string,
  req: RequestInit,
  options: {
    resValue?: RequestResValue;
    error?: {
      endpoint: Endpoint;
      status?: number;
    };
  } = {}
): Call<void | Response> {
  if (s.syncState.loadingCount === 0) {
    assert.fail('Loading state not set');
  }

  const endpoint = url.split(/\/api(?=\/)/)[1] as Endpoint;
  const reqPayload: { notes?: n.Note[] } = JSON.parse(req.body?.toString() ?? '{}');

  if (!ENDPOINTS.includes(endpoint)) {
    assert.fail(`Invalid endpoint: ${endpoint}`);
  }

  // Mock server error
  if (options.error?.endpoint === endpoint) {
    const resInit = {
      status: options.error.status || 500,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    let errorMsg = 'Server error';

    if (options.error.status === 401) {
      errorMsg = 'Unauthorized';
    } else if (options.error.status === 404) {
      errorMsg = 'User not found';
    }

    const res = new Response(JSON.stringify({ error: errorMsg }), resInit);

    return {
      name: endpoint,
      promise: resolveImmediate(res),
    };
  }

  // @ts-expect-error - doesn't matter if undefined
  const username: string = req.headers!['X-Username'] ?? '';

  const resData: {
    notes?: n.Note[] | EncryptedNote[];
    access_token?: string;
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
        const resValue = options.resValue?.['/signup']?.shift();

        mockDb.users[reqPayload.username] = reqPayload.password;
        resData.access_token = resValue?.access_token ?? 'test-token';

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

        resData.notes = resValue?.notes ?? [];
        resData.access_token = resValue?.access_token ?? 'test-token';
      }

      break;
    case '/logout':
      if (!hasValidAuthHeaders(req.headers)) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else if (!(username in mockDb.users)) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        httpStatus = 204;
      }

      break;
    case '/notes/pull':
      // Pull
      if (!hasValidAuthHeaders(req.headers)) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else if (!mockDb.users[username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        const resValue = options.resValue?.['/notes/pull']?.shift();

        resData.notes = resValue?.notes ?? [];
        resData.access_token = resValue?.access_token ?? 'test-token';
      }

      break;
    case '/notes/push':
      if (!hasValidAuthHeaders(req.headers)) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else if (!hasKeys(reqPayload, ['notes'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (reqPayload.notes?.some((nt) => !isEncryptedNote(nt))) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        httpStatus = 204;
      }

      break;
    case '/account/password/change':
      if (!hasValidAuthHeaders(req.headers)) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else if (!hasKeys(reqPayload, ['current_password', 'new_password'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.current_password !== 'string' ||
        typeof reqPayload.new_password !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (reqPayload.current_password !== mockDb.users[username]) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else {
        const resValue = options.resValue?.['/notes/pull']?.shift();

        resData.access_token = resValue?.access_token ?? 'test-token';
      }

      break;
    case '/account/delete':
      if (!hasValidAuthHeaders(req.headers)) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else if (!mockDb.users[username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        delete mockDb.users[username];
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
  options: { resValue?: InvokeResValue; error?: TauriCommand } = {}
) {
  if (options.error === cmd) {
    throw new Error('Mock Tauri Invoke error');
  }

  let resData: n.Note[] | string | undefined = [];

  switch (cmd) {
    case 'get_all_notes': {
      resData =
        // Allow undefined res values for returning no notes
        !options.resValue || !('get_all_notes' in options.resValue)
          ? copyObjArr(localNotes)
          : options.resValue.get_all_notes!.shift();

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
    case 'set_access_token':
      if (!hasKeys(args, ['username', 'accessToken'])) {
        assert.fail('Missing username or accessToken');
      } else if (typeof args.username !== 'string') {
        assert.fail('Invalid username');
      } else if (typeof args.accessToken !== 'string') {
        assert.fail('Invalid accessToken');
      }

      mockKeyring[args.username] = args.accessToken;

      break;
    case 'get_access_token':
      if (!hasKeys(args, ['username'])) {
        assert.fail('Missing username');
      } else if (typeof args.username !== 'string') {
        assert.fail('Invalid username');
      }

      resData = mockKeyring[args.username];

      break;
    case 'delete_access_token':
      if (!hasKeys(args, ['username'])) {
        assert.fail('Missing username');
      } else if (typeof args.username !== 'string') {
        assert.fail('Invalid username');
      }

      delete mockKeyring[args.username];

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
  options: { resValue?: TauriApiResValue; error?: string } = {}
) {
  if (options.error === callId) {
    throw new Error('Mock Tauri API error');
  }

  let resData: TauriApiResValue[string][number] | undefined;
  let calledWith;

  switch (callId) {
    case 'plugin:app|version':
      resData = pkg.version;

      break;
    case 'plugin:dialog|ask': {
      const askDialogArgs = args as AskDialogArgs;
      const resValue = options.resValue?.askDialog?.shift();

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
      const resValue = options.resValue?.openDialog?.shift();

      resData = resValue === undefined ? 'C:\\path' : resValue;
      calledWith = {
        directory: openDialogArgs.options.directory,
        multiple: openDialogArgs.options.multiple,
        recursive: openDialogArgs.options.recursive,
        title: openDialogArgs.options.title,
      };

      break;
    }
    case 'plugin:dialog|message': {
      const messageDialogArgs = args as MessageDialogArgs;

      calledWith = {
        message: messageDialogArgs.message,
        okLabel: messageDialogArgs.okLabel,
        title: messageDialogArgs.title,
        kind: messageDialogArgs.kind,
      };

      break;
    }
    case 'plugin:updater|check': {
      const resValue = options.resValue?.checkUpdate?.shift();

      const defaultResValue = {
        rid: 1,
        available: true,
        version: '1.0.0',
        currentVersion: '0.9.0',
      } satisfies NonNullable<typeof resValue>;

      resData = {
        ...defaultResValue,
        ...resValue,
      };

      break;
    }
    case 'plugin:updater|download_and_install': {
      const resValue = options.resValue?.downloadAndInstallUpdate?.shift();

      resData = resValue;

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

type MessageDialogArgs = {
  message: string;
  okLabel?: string;
  title?: string;
  kind?: 'error' | 'info' | 'warning';
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
  [E in keyof EndpointPayloads]?: Partial<EndpointPayloads[E]['response']>[];
};
type InvokeResValue = {
  [C in keyof TauriCommandPayloads]?: TauriCommandPayloads[C]['response'][];
};
type TauriApiResValue = Record<string, unknown[]> & {
  askDialog?: boolean[];
  openDialog?: string[];
  checkUpdate?: Partial<ConstructorParameters<typeof Update>[0]>[];
  downloadAndInstallUpdate?: ReturnType<Update['downloadAndInstall']>[];
};

type Call<T = unknown> = {
  name: string;
  calledWith?: unknown;
  promise?: Promise<T>;
};

type ApiCallType = 'request' | 'invoke' | 'tauriApi' | 'emits' | 'listeners';
type ApiCalls = { [T in ApiCallType]: Calls } & { size: number };
