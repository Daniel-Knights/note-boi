import { mockIPC } from '@tauri-apps/api/mocks';

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
import { copyObjArr, isEncryptedNote, isNote } from './utils';

type ReqArgsMessage = {
  cmd: 'httpRequest';
  options: {
    url: string;
    method: string;
    responseType: number;
    body: {
      type: string;
      payload?: EndpointPayloads[Endpoint]['payload'];
    };
  };
};

type AskDialogArgsMessage = {
  buttonLabels: ['Yes', 'No'];
  cmd: 'askDialog';
  message: string;
  title?: string;
  type?: 'error' | 'info' | 'warning';
};

type OpenDialogArgsMessage = {
  cmd: 'openDialog';
  options: {
    directory?: boolean;
    multiple?: boolean;
    recursive?: boolean;
    title?: string;
  };
};

type ListenArgsMessage = {
  cmd: 'listen';
  event: string;
  handler: number;
  windowLabel: string | null;
};

type EmitArgsMessage = {
  cmd: 'emit';
  event: string;
  payload?: unknown;
  windowLabel?: string | null;
};

type ArgsMessage =
  | ReqArgsMessage
  | AskDialogArgsMessage
  | OpenDialogArgsMessage
  | ListenArgsMessage
  | EmitArgsMessage
  | { cmd: 'getAppVersion' };

type Args = { message?: ArgsMessage };

type RequestResValue = {
  [E in keyof EndpointPayloads]?: EndpointPayloads[E]['response'][];
};
type InvokeResValue = {
  [C in keyof TauriCommandPayloads]?: TauriCommandPayloads[C]['response'][];
};
type TauriApiResValue = Record<string, unknown[]> & {
  askDialog?: boolean[];
  openDialog?: string[];
};

type Call<T = unknown> = {
  name: string;
  calledWith?: unknown;
  promise?: Promise<T>;
};

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

type ApiCallType = 'request' | 'invoke' | 'tauriApi' | 'emits' | 'listeners';
type ApiCalls = { [T in ApiCallType]: Calls } & { size: number };

export const mockDb: {
  users: Record<string, string>;
  encryptedNotes: EncryptedNote[];
} = {
  users: {
    d: '1',
  },
  encryptedNotes: undefined as unknown as EncryptedNote[],
};

/** Mocks requests to the server. */
function mockRequest(
  callId: string,
  args?: Args,
  options?: {
    resValue?: RequestResValue;
    error?: Endpoint;
  }
): Call<void | { status: number; data: unknown }> | void {
  const msg = args?.message;

  if (callId !== 'tauri' || msg?.cmd !== 'httpRequest') return;

  if (!s.syncState.isLoading) {
    assert.fail('Loading state not set');
  }

  const reqOptions = msg.options;
  const endpoint = reqOptions.url.split(/\/api(?=\/)/)[1] as Endpoint;
  const reqPayload = reqOptions.body.payload;

  if (!ENDPOINTS.includes(endpoint)) {
    assert.fail('Invalid endpoint');
  }

  if (options?.error === endpoint) {
    return {
      name: endpoint,
      promise: Promise.resolve({
        status: 500,
        data: JSON.stringify({ error: 'Server error' }),
      }),
    };
  }

  const resData: {
    notes?: n.Note[] | EncryptedNote[];
    token?: string;
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
        resData.token = 'token';
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
        const resValue = options?.resValue?.['/login']?.shift();

        resData.notes = resValue?.notes || [];
        resData.token = 'token';
      }

      break;
    case '/logout':
      if (!hasKeys(reqPayload, ['username', 'token'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.token !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[reqPayload.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        httpStatus = 204;
      }

      break;
    case '/notes/pull':
      // Pull
      if (!hasKeys(reqPayload, ['username', 'token'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.token !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[reqPayload.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (reqPayload.token !== 'token') {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else {
        const resValue = options?.resValue?.['/notes/pull']?.shift();

        resData.notes = resValue?.notes || [];
      }
      break;
    case '/notes/push':
      if (!hasKeys(reqPayload, ['username', 'token', 'notes'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        reqPayload.notes?.some((nt) => !isEncryptedNote(nt)) ||
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.token !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[reqPayload.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (reqPayload.token !== 'token') {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else {
        httpStatus = 204;
      }

      break;
    case '/account/password/change':
      if (
        !hasKeys(reqPayload, ['username', 'token', 'current_password', 'new_password'])
      ) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.token !== 'string' ||
        typeof reqPayload.current_password !== 'string' ||
        typeof reqPayload.new_password !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[reqPayload.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (
        reqPayload.token !== 'token' ||
        reqPayload.current_password !== mockDb.users[reqPayload.username]
      ) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else {
        resData.token = 'token';
      }

      break;
    case '/account/delete':
      if (!hasKeys(reqPayload, ['username', 'token'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (
        typeof reqPayload.username !== 'string' ||
        typeof reqPayload.token !== 'string'
      ) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[reqPayload.username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else if (reqPayload.token !== 'token') {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else {
        delete mockDb.users[reqPayload.username];
        httpStatus = 204;
      }
  }

  return {
    name: endpoint,
    promise: Promise.resolve({
      status: httpStatus,
      data: JSON.stringify(resData),
    }),
  };
}

/** Mocks Tauri `invoke` calls. */
function mockTauriInvoke(
  callId: string,
  args: Record<string, unknown>,
  options?: { resValue?: InvokeResValue; error?: string }
): Call<n.Note[] | void> | void {
  if (callId === 'tauri') return;

  const cmd = callId as TauriCommand;

  if (!TAURI_COMMANDS.includes(cmd)) {
    assert.fail('Invalid command');
  }

  if (options?.error === cmd) {
    return {
      name: cmd,
      calledWith: args,
      promise: Promise.resolve(undefined),
    };
  }

  let resData: n.Note[] = [];

  switch (cmd) {
    case 'get_all_notes': {
      const resValue = options?.resValue?.get_all_notes?.shift();

      resData = resValue || copyObjArr(localNotes);

      break;
    }
    case 'new_note':
      if (!hasKeys(args, ['note'])) {
        throw new Error('Missing note');
      } else if (!isNote(args.note)) {
        throw new Error('Invalid note');
      }

      break;
    case 'edit_note':
      if (!hasKeys(args, ['note'])) {
        throw new Error('Missing note');
      } else if (!isNote(args.note)) {
        throw new Error('Invalid note');
      }

      break;
    case 'delete_note':
      if (!hasKeys(args, ['id'])) {
        throw new Error('Missing id');
      } else if (typeof args.id !== 'string') {
        throw new Error('Invalid id');
      }

      break;
    case 'sync_local_notes':
      if (!hasKeys(args, ['notes'])) {
        throw new Error('Missing notes');
      } else if (!Array.isArray(args.notes) || args.notes.some((nt) => !isNote(nt))) {
        throw new Error('Invalid notes');
      }

      break;
    case 'export_notes':
      if (!hasKeys(args, ['saveDir', 'notes'])) {
        throw new Error('Missing saveDir or notes');
      } else if (
        typeof args.saveDir !== 'string' ||
        !Array.isArray(args.notes) ||
        args.notes.some((nt) => !isNote(nt))
      ) {
        throw new Error('Invalid saveDir or notes');
      }

      break;
  }

  return {
    name: cmd,
    calledWith: args,
    promise: Promise.resolve(resData),
  };
}

/** Mocks calls to the Tauri API. */
function mockTauriApi(
  callId: string,
  args?: Args,
  options?: { resValue?: TauriApiResValue }
): Call<string | boolean | void> | void {
  if (callId !== 'tauri') return;

  const msg = args?.message;

  if (!msg?.cmd || /emit|listen|createClient/.test(msg.cmd)) return;

  let resData: string | boolean | undefined;
  let calledWith;

  switch (msg.cmd) {
    case 'getAppVersion':
      resData = pkg.version;

      break;
    case 'askDialog': {
      const resValue = options?.resValue?.askDialog?.[0];

      if (resValue) {
        options.resValue?.askDialog?.shift();
      }

      resData = resValue === undefined ? true : resValue;
      calledWith = {
        message: msg.message,
        title: msg.title,
        type: msg.type,
      };

      break;
    }
    case 'openDialog': {
      const resValue = options?.resValue?.openDialog?.[0];

      if (resValue) {
        options.resValue?.openDialog?.shift();
      }

      resData = resValue === undefined ? 'C:\\path' : resValue;
      calledWith = {
        directory: msg.options.directory,
        multiple: msg.options.multiple,
        recursive: msg.options.recursive,
        title: msg.options.title,
      };
    }
  }

  return {
    name: msg.cmd,
    calledWith,
    promise: Promise.resolve(resData),
  };
}

/** Mocks Tauri `event.emit` calls. */
function mockTauriEmit(callId: string, args?: Args): Call | void {
  if (callId !== 'tauri') return;

  const msg = args?.message as EmitArgsMessage;

  if (msg?.cmd !== 'emit') return;

  return {
    name: msg.event,
    calledWith: msg.payload,
  };
}

/** Mocks Tauri `event.listen` calls. */
function mockTauriListener(callId: string, args?: Args): string | void {
  if (callId !== 'tauri') return;

  const msg = args?.message;

  if (msg?.cmd !== 'listen') return;

  return msg.event;
}

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
 *     error: '/login',
 *   },
 * });
 * ```
 */
export function mockApi(options?: {
  request?: {
    resValue?: RequestResValue;
    error?: Endpoint;
  };
  invoke?: {
    resValue?: InvokeResValue;
    error?: TauriCommand;
  };
  tauriApi?: {
    resValue?: TauriApiResValue;
  };
}): {
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

  function parseCallResult(callType: Exclude<keyof ApiCalls, 'size'>, call: Call) {
    calls[callType].push(call);
    calls.size += 1;

    if (call.promise) {
      promises.push(call.promise);
    }

    return call.promise;
  }

  mockIPC((callId, args) => {
    const reqCall = mockRequest(callId, args, options?.request);

    if (reqCall) {
      return parseCallResult('request', reqCall);
    }

    const invokeCall = mockTauriInvoke(callId, args, options?.invoke);

    if (invokeCall) {
      return parseCallResult('invoke', invokeCall);
    }

    const tauriApiCall = mockTauriApi(callId, args, options?.tauriApi);

    if (tauriApiCall) {
      return parseCallResult('tauriApi', tauriApiCall);
    }

    const emitCall = mockTauriEmit(callId, args);

    if (emitCall) {
      return parseCallResult('emits', emitCall);
    }

    const listenerCall = mockTauriListener(callId, args);

    if (listenerCall) {
      return parseCallResult('listeners', { name: listenerCall });
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
