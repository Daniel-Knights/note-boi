import * as s from '../../store/sync';
import { AppError, ErrorConfig, FetchBuilder } from '../../classes';
import { Endpoint } from '../../constant';
import { mockApi } from '../api';

import { isObj } from './object';

/**
 * Asserts current `appError` against expected.
 * No `expectedErrorConfig` asserts a `NONE` error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertAppError<T extends (...args: any[]) => void>(
  expectedErrorConfig?: ErrorConfig<T>
) {
  const { appError } = s.syncState;

  if (!expectedErrorConfig && appError.isNone) {
    assert.hasAllDeepKeys(appError, new AppError());

    return;
  }

  if (!expectedErrorConfig) {
    assert.fail('Missing expectedErrorConfig');
  }

  if (expectedErrorConfig.message) {
    assert.strictEqual(appError.message, expectedErrorConfig.message);
  } else {
    assert.isNotEmpty(appError.message, expectedErrorConfig.message);
  }

  assert.strictEqual(appError.code, expectedErrorConfig.code);
  assert.strictEqual(appError.retryConfig?.fn, expectedErrorConfig.retry?.fn);
  assert.sameOrderedMembers(
    appError.retryConfig?.args || [],
    expectedErrorConfig.retry?.args || []
  );
  assert.deepEqual(appError.display, expectedErrorConfig.display);
}

/**
 * Asserts loading count is 0 before `cb`, >= 1 during, and 0 after.
 */
export async function assertLoadingState(
  cb: (
    calls: ReturnType<typeof mockApi>['calls'],
    promises: Promise<unknown>[]
  ) => Promise<void>
) {
  const { calls, promises } = mockApi();

  assert.strictEqual(s.syncState.loadingCount, 0);

  const cbPromise = cb(calls, promises);

  assert.isAtLeast(s.syncState.loadingCount, 1);

  await cbPromise;
  await Promise.all(promises);

  assert.strictEqual(s.syncState.loadingCount, 0);
}

export function assertHasAllKeys<T extends string>(
  obj: unknown,
  keys: T[] | Record<T, unknown>
): asserts obj is { [key in T]: unknown } {
  assert.hasAllKeys(obj, keys);
}

export function assertIsString(obj: unknown): asserts obj is string {
  assert.isString(obj);
}

export function assertIsArray(obj: unknown): asserts obj is unknown[] {
  assert.isArray(obj);
}

/**
 * Asserts that `req` matches the expected request for `endpoint`.
 * `req` should typically be `calls.request[<n>]!.calledWith!`.
 */
export function assertRequest(endpoint: Endpoint, req: RequestInit) {
  assert.strictEqual(req.method, expectedRequests[endpoint].method);
  assert.deepInclude(req.headers, FetchBuilder.defaultHeaders);

  if ('body' in expectedRequests[endpoint] && isObj(expectedRequests[endpoint].body)) {
    const parsedBody = JSON.parse(req.body as string) as Record<string, unknown>;

    assertHasAllKeys(parsedBody, expectedRequests[endpoint].body);

    for (const [key, value] of Object.entries(expectedRequests[endpoint].body)) {
      if (isObj(value)) {
        if (value.isArray) {
          assertIsArray(parsedBody[key]);

          const expectedKeys = value.expectedKeys as Record<string, string>;

          for (const obj of parsedBody[key]) {
            assertHasAllKeys(obj, expectedKeys);
          }
        } else {
          assertHasAllKeys(
            parsedBody[key],
            value.expectedKeys as Record<string, unknown>
          );
        }
      } else {
        assert.strictEqual(typeof parsedBody[key], value);
      }
    }
  }
}

const expectedRequests = {
  '/auth/signup': {
    method: 'POST',
    body: {
      username: 'string',
      password: 'string',
      notes: {
        isArray: true,
        expectedKeys: {
          id: 'string',
          timestamp: 'number',
          content: 'string',
        },
      },
    },
  },
  '/auth/login': {
    method: 'POST',
    body: {
      username: 'string',
      password: 'string',
    },
  },
  '/auth/logout': {
    method: 'POST',
  },
  '/notes/push': {
    method: 'PUT',
    body: {
      notes: {
        isArray: true,
        expectedKeys: {
          id: 'string',
          timestamp: 'number',
          content: 'string',
        },
      },
    },
  },
  '/notes/pull': {
    method: 'GET',
  },
  '/account/delete': {
    method: 'DELETE',
  },
  '/account/change-password': {
    method: 'PUT',
    body: {
      current_password: 'string',
      new_password: 'string',
      notes: {
        isArray: true,
        expectedKeys: {
          id: 'string',
          timestamp: 'number',
          content: 'string',
        },
      },
    },
  },
} satisfies Record<
  Endpoint,
  {
    method: string;
    body?: Record<
      string,
      string | { isArray?: boolean; expectedKeys: Record<string, string> }
    >;
  }
>;
