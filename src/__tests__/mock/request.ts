import * as n from '../../store/note';
import * as s from '../../store/sync';
import { EncryptedNote } from '../../classes';
import { Endpoint, EndpointPayloads, ENDPOINTS, NoteDiff } from '../../constant';
import { hasKeys } from '../../utils';
import { isEncryptedNote, NoteCollection, resolveImmediate } from '../utils';

import { mockKeyring } from './tauri';

export const mockDb: {
  users: Record<string, string>;
  encryptedNotes: EncryptedNote[];
  deletedNoteIds?: Set<string>;
} = {
  users: {
    d: '1',
  },
  encryptedNotes: [],
};

export const initialMockDb = Object.freeze(structuredClone(mockDb));

/** Mocks requests to the server. */
export function mockRequest(
  url: string,
  req: RequestInit,
  options: {
    resValue?: RequestResValue;
    error?: {
      endpoint: Endpoint;
      status?: number;
    };
  } = {}
) {
  if (s.syncState.loadingCount === 0) {
    assert.fail('Loading state not set');
  }

  const endpoint = url.split(/\/api(?=\/)/)[1] as Endpoint;

  if (!ENDPOINTS.includes(endpoint)) {
    assert.fail(`Invalid endpoint: ${endpoint}`);
  }

  const reqPayload: EndpointPayloads[Endpoint]['payload'] = JSON.parse(
    req.body?.toString() ?? '{}'
  );

  const calledWith = {
    body: req.body,
    method: req.method,
    headers: req.headers,
  };

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
      calledWith,
      promise: resolveImmediate(res),
    };
  }

  // @ts-expect-error - doesn't matter if undefined
  const username: string = req.headers!['X-Username'] ?? '';

  const resData: {
    notes?: n.Note[] | EncryptedNote[];
    note_diff?: NoteDiff;
    access_token?: string;
    error?: string;
  } = {};

  let httpStatus = 200;

  switch (endpoint) {
    case '/auth/signup':
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
        const resValue = options.resValue?.['/auth/signup']?.shift();

        mockDb.users[reqPayload.username] = reqPayload.password;
        resData.access_token = resValue?.access_token ?? 'test-token';

        httpStatus = 201;
      }

      break;
    case '/auth/login':
      if (!hasKeys(reqPayload, ['username', 'password', 'notes', 'deleted_note_ids'])) {
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
        const resValue = options.resValue?.['/auth/login']?.shift();
        const noteDiff = syncDbNotesFromRequest(reqPayload);

        resData.note_diff = noteDiff;
        resData.access_token = resValue?.access_token ?? 'test-token';
      }

      break;
    case '/auth/logout':
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
    case '/notes/sync':
      if (!hasValidAuthHeaders(req.headers)) {
        resData.error = 'Unauthorized';
        httpStatus = 401;
      } else if (!hasKeys(reqPayload, ['notes', 'deleted_note_ids'])) {
        resData.error = 'Missing required fields';
        httpStatus = 400;
      } else if (reqPayload.notes?.some((nt) => !isEncryptedNote(nt))) {
        resData.error = 'Invalid fields';
        httpStatus = 400;
      } else if (!mockDb.users[username]) {
        resData.error = 'User not found';
        httpStatus = 404;
      } else {
        const resValue = options.resValue?.['/notes/sync']?.shift();
        const noteDiff = syncDbNotesFromRequest(reqPayload);

        resData.note_diff = noteDiff;
        resData.access_token = resValue?.access_token ?? 'test-token';
      }

      break;
    case '/account/change-password':
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
        const resValue = options.resValue?.['/account/change-password']?.shift();

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
    calledWith,
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

//// Helpers

function hasValidAuthHeaders(headers?: HeadersInit) {
  return (
    headers &&
    'Authorization' in headers &&
    'X-Username' in headers &&
    headers.Authorization.replace('Bearer ', '') === mockKeyring[headers['X-Username']]
  );
}

/** Syncs notes from the request payload with those in the mock database. */
function syncDbNotesFromRequest(
  reqPayload: EndpointPayloads['/notes/sync' | '/auth/login']['payload']
) {
  const dbNotes = new NoteCollection(mockDb.encryptedNotes);
  const payloadNotes = new NoteCollection(reqPayload.notes ?? []);
  const deletedNoteIds = new Set(reqPayload.deleted_note_ids).union(
    new Set(mockDb.deletedNoteIds)
  );
  const diff = dbNotes.merge(payloadNotes, deletedNoteIds);

  mockDb.encryptedNotes = dbNotes.notes;
  mockDb.deletedNoteIds = deletedNoteIds;

  return diff;
}

//// Types

export type RequestResValue = {
  [E in keyof EndpointPayloads]?: Partial<EndpointPayloads[E]['response']>[];
};
