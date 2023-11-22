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
} from '../constant';
import { EncryptedNote } from '../store/sync/encryptor';

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

type RegisteredEvents = {
  emits: string[];
  listeners: string[];
};

type RequestResValue = {
  [E in keyof EndpointPayloads]?: Partial<EndpointPayloads[E]['response']>[];
};
type InvokeResValue = Partial<Record<TauriCommand, unknown[]>> & {
  get_all_notes?: n.Note[][];
};
type TauriApiResValue = Record<string, unknown[]> & {
  askDialog?: boolean[];
  openDialog?: string[];
};

type CalledWith =
  | {
      message: string;
      title?: string;
      type?: string;
    }
  | {
      directory?: boolean;
      multiple?: boolean;
      recursive?: boolean;
      title?: string;
    };

type Call = { name: string; calledWith?: CalledWith };

class Calls extends Array<Call> {
  has(name: string, count?: number): boolean {
    if (count) {
      return super.filter((c) => c.name === name).length === count;
    }

    return super.some((c) => c.name === name);
  }
}

export const mockDb: {
  users: Record<string, string>;
  encryptedNotes: EncryptedNote[];
} = {
  users: {
    d: '1',
  },
  encryptedNotes: undefined as unknown as EncryptedNote[],
};

function getResValue<E extends Endpoint>(
  endpoint: E,
  options?: { resValue?: RequestResValue }
): NonNullable<RequestResValue[E]>[number] | undefined {
  const resValue = options?.resValue?.[endpoint]?.[0];

  if (resValue) {
    options.resValue?.[endpoint]?.shift();
  }

  return resValue;
}

function mockRequest(
  callId: string,
  args?: Args,
  options?: {
    resValue?: RequestResValue;
    error?: Endpoint;
  }
): {
  endpoint: Endpoint;
  response: Promise<void | { status: number; data: unknown }>;
} | void {
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
      endpoint,
      response: Promise.resolve({
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
      if (
        !reqPayload ||
        !('notes' in reqPayload) ||
        !('username' in reqPayload) ||
        !('password' in reqPayload)
      ) {
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
      if (!reqPayload || !('username' in reqPayload) || !('password' in reqPayload)) {
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
        const resValue = getResValue('/login', options);

        resData.notes = resValue?.notes || [];
        resData.token = 'token';
      }

      break;
    case '/logout':
      if (!reqPayload || !('username' in reqPayload) || !('token' in reqPayload)) {
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
      if (!reqPayload || !('username' in reqPayload) || !('token' in reqPayload)) {
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
        const resValue = getResValue('/notes/pull', options);

        resData.notes = resValue?.notes || [];
      }
      break;
    case '/notes/push':
      if (
        !reqPayload ||
        !('notes' in reqPayload) ||
        !('username' in reqPayload) ||
        !('token' in reqPayload)
      ) {
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
        !reqPayload ||
        !('username' in reqPayload) ||
        !('token' in reqPayload) ||
        !('current_password' in reqPayload) ||
        !('new_password' in reqPayload)
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
      if (!reqPayload || !('username' in reqPayload) || !('token' in reqPayload)) {
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
    // no default
  }

  return {
    endpoint,
    response: Promise.resolve({
      status: httpStatus,
      data: JSON.stringify(resData),
    }),
  };
}

function mockTauriInvoke(
  callId: string,
  args:
    | { note: n.Note }
    | { id: string }
    | { saveDir: string; notes: n.Note[] }
    | Record<string, unknown>,
  options?: { resValue?: InvokeResValue; error?: string }
): {
  cmd: TauriCommand;
  response: Promise<n.Note[] | void>;
} | void {
  if (callId === 'tauri') return;

  const cmd = callId as TauriCommand;

  if (!TAURI_COMMANDS.includes(cmd)) {
    assert.fail('Invalid command');
  }

  if (options?.error === cmd) {
    return {
      cmd,
      response: Promise.resolve(undefined),
    };
  }

  let resData: n.Note[] = [];

  switch (cmd) {
    case 'get_all_notes': {
      const resValue = options?.resValue?.get_all_notes?.[0];

      if (resValue) {
        options.resValue?.get_all_notes?.shift();
      }

      resData = resValue || copyObjArr(localNotes);

      break;
    }
    case 'new_note':
      if (!('note' in args)) {
        throw new Error('Missing note');
      } else if (!isNote(args.note)) {
        throw new Error('Invalid note');
      }

      break;
    case 'edit_note':
      if (!('note' in args)) {
        throw new Error('Missing note');
      } else if (!isNote(args.note)) {
        throw new Error('Invalid note');
      }

      break;
    case 'delete_note':
      if (!('id' in args)) {
        throw new Error('Missing id');
      } else if (typeof args.id !== 'string') {
        throw new Error('Invalid id');
      }

      break;
    case 'sync_local_notes':
      if (!('notes' in args)) {
        throw new Error('Missing notes');
      } else if (!Array.isArray(args.notes) || args.notes.some((nt) => !isNote(nt))) {
        throw new Error('Invalid notes');
      }

      break;
    case 'export_notes':
      if (!('saveDir' in args) || !('notes' in args)) {
        throw new Error('Missing saveDir or notes');
      } else if (
        typeof args.saveDir !== 'string' ||
        !Array.isArray(args.notes) ||
        args.notes.some((nt) => !isNote(nt))
      ) {
        throw new Error('Invalid saveDir or notes');
      }

      break;
    // no default
  }

  return {
    cmd,
    response: Promise.resolve(resData),
  };
}

/** Mocks calls to the Tauri API. */
function mockTauriApi(
  callId: string,
  args?: Args,
  options?: { resValue?: TauriApiResValue }
): {
  fn: string;
  response: Promise<string | boolean | void>;
  calledWith?: CalledWith;
} | void {
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
    // no default
  }

  return {
    fn: msg.cmd,
    response: Promise.resolve(resData),
    calledWith,
  };
}

function mockTauriEmit(callId: string, args?: Args): string | void {
  if (callId !== 'tauri') return;

  const msg = args?.message;

  if (msg?.cmd !== 'emit') return;

  return msg.event;
}

function mockTauriListener(callId: string, args?: Args): string | void {
  if (callId !== 'tauri') return;

  const msg = args?.message;

  if (msg?.cmd !== 'listen') return;

  return msg.event;
}

export function mockApi(options?: {
  request?: {
    resValue?: RequestResValue;
    error?: Endpoint;
  };
  invoke?: {
    resValue?: InvokeResValue;
    error?: TauriCommand;
  };
  api?: {
    resValue?: TauriApiResValue;
  };
}): {
  calls: Calls;
  events: RegisteredEvents;
  promises: Promise<unknown>[];
} {
  const calls = new Calls();
  const events: RegisteredEvents = {
    emits: [],
    listeners: [],
  };
  const promises: Promise<unknown>[] = [];

  mockIPC((callId, args) => {
    const reqCall = mockRequest(callId, args, options?.request);

    if (reqCall) {
      calls.push({ name: reqCall.endpoint });
      promises.push(reqCall.response);

      return reqCall.response;
    }

    const invokeCall = mockTauriInvoke(callId, args, options?.invoke);

    if (invokeCall) {
      calls.push({ name: invokeCall.cmd });
      promises.push(invokeCall.response);

      return invokeCall.response;
    }

    const apiCall = mockTauriApi(callId, args, options?.api);

    if (apiCall) {
      calls.push({
        name: apiCall.fn,
        calledWith: apiCall.calledWith,
      });
      promises.push(apiCall.response);

      return apiCall.response;
    }

    const emitCall = mockTauriEmit(callId, args);

    if (emitCall) {
      events.emits.push(emitCall);

      return;
    }

    const listenerCall = mockTauriListener(callId, args);

    if (listenerCall) {
      events.listeners.push(listenerCall);
    }
  });

  return {
    calls,
    events,
    promises,
  };
}

export function clearMockApiResults(results: {
  calls?: Calls;
  events?: RegisteredEvents;
  promises?: Promise<unknown>[];
}): void {
  results.calls?.splice(0, results.calls.length);

  if (results.events) {
    results.events.emits = [];
    results.events.listeners = [];
  }

  results.promises?.splice(0, results.promises.length);
}
