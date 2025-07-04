import * as s from '../../store/sync';
import { AppError, ErrorConfig, FetchBuilder, RetryFn } from '../../classes';
import { Endpoint } from '../../constant';
import { mockApi } from '../mock';

/**
 * Asserts current `appError` against expected.
 * No `expectedErrorConfig` asserts a `NONE` error.
 */
export function assertAppError<T extends RetryFn>(
  expectedErrorConfig?: Omit<ErrorConfig<T>, 'retry'> & {
    retry?: ErrorConfig<T>['retry'] | { args: Parameters<T> };
  }
) {
  const { appError } = s.syncState;

  if (!expectedErrorConfig && appError.isNone) {
    assert.hasAllDeepKeys(appError, new AppError());

    return;
  }

  if (!expectedErrorConfig) {
    assert.fail('Expected appError to be NONE');
  }

  if (expectedErrorConfig.message) {
    assert.strictEqual(appError.message, expectedErrorConfig.message);
  } else {
    assert.isNotEmpty(appError.message, expectedErrorConfig.message);
  }

  if (expectedErrorConfig.retry) {
    // In some cases strict equality can't be checked, because the function isn't a bound
    // reference. In that case we just assert that it's a function.
    if ('fn' in expectedErrorConfig.retry) {
      assert.strictEqual(appError.retryConfig?.fn, expectedErrorConfig.retry.fn);
    } else {
      assert.isFunction(appError.retryConfig?.fn);
    }

    assert.sameOrderedMembers(
      appError.retryConfig?.args || [],
      expectedErrorConfig.retry.args || []
    );
  }

  assert.strictEqual(appError.code, expectedErrorConfig.code);
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

/**
 * Asserts that `req` matches the expected request for `endpoint`.
 * `req` should typically be `calls.request[<n>]!.calledWith!`.
 */
export function assertRequest(endpoint: Endpoint, req: RequestInit) {
  assert.strictEqual(req.method, expectedRequests[endpoint].method);
  assert.deepInclude(req.headers, FetchBuilder.defaultHeaders);

  // Assert auth headers
  if ('withAuth' in expectedRequests[endpoint] && expectedRequests[endpoint].withAuth) {
    assertHasAllKeys(req.headers, [
      ...Object.keys(FetchBuilder.defaultHeaders),
      'Authorization',
      'X-Username',
    ]);
    assertIsString(req.headers.Authorization);
    assertIsString(req.headers['X-Username']);
    assert.isTrue(req.headers.Authorization?.startsWith('Bearer '));
    assert.isTrue(req.headers.Authorization?.length > 'Bearer '.length);
    assert.isTrue(req.headers['X-Username'].length > 0);
  }

  // Assert body
  if (expectedRequests[endpoint].body) {
    const parsedBody = JSON.parse(req.body as string) as Record<string, unknown>;

    assertType(parsedBody, expectedRequests[endpoint].body);
  }
}

/** Asserts `actualValue` has the type defined by `expectedType`. */
export function assertType(value: unknown, expectedType: ExpectedType) {
  let resolvedValue = value;

  // If the expected value has a key, assert `actualValue` is an object with that key
  // and resolve the `actualValue` to the value of that property
  if ('key' in expectedType && expectedType.key) {
    assertIsObject(value);
    assert.isTrue(expectedType.key in value);

    resolvedValue = value[expectedType.key];
  }

  switch (expectedType.type) {
    case 'string':
      assertIsString(resolvedValue);

      break;
    case 'number':
      assertIsNumber(resolvedValue);

      break;
    case 'object':
      assertIsObject(resolvedValue);

      // Ensure value doesn't have any extra properties
      assert.strictEqual(Object.keys(resolvedValue).length, expectedType.values.length);

      // Loop over each expected property type and assert the value has them all
      expectedType.values.forEach((expectedProperty) => {
        assertType(resolvedValue, expectedProperty);
      });

      break;
    case 'array':
      assertIsArray(resolvedValue);

      // Loop over each item and assert it has the expected type
      resolvedValue.forEach((actualItem) => {
        assertType(actualItem, expectedType.values);
      });

      break;
  }
}

export function assertHasAllKeys<T extends string>(
  val: unknown,
  keys: T[] | Record<T, unknown>
): asserts val is { [key in T]: unknown } {
  assert.hasAllKeys(val, keys);
}

export function assertIsString(val: unknown): asserts val is string {
  assert.isString(val);
}

export function assertIsNumber(val: unknown): asserts val is number {
  assert.isNumber(val);
}

export function assertIsObject(val: unknown): asserts val is Record<string, unknown> {
  assert.isObject(val);
}

export function assertIsArray(val: unknown): asserts val is unknown[] {
  assert.isArray(val);
}

//// Expected

/** Recursive type that describes expected structure of a given value. */
type ExpectedType =
  | {
      key?: string; // Only used for object properties, not array items
      type: 'string' | 'number';
    }
  | {
      type: 'object';
      /** Expected types for each property */
      values: ExpectedType[];
    }
  | {
      key: string;
      type: 'array';
      /** Expected type of every array item */
      values: ExpectedType;
    };

const expectedNoteType: ExpectedType = {
  type: 'object',
  values: [
    {
      key: 'uuid',
      type: 'string',
    },
    {
      key: 'timestamp',
      type: 'number',
    },
    {
      key: 'content',
      type: 'string',
    },
  ],
};

const expectedDeletedNoteType: ExpectedType = {
  type: 'object',
  values: [
    {
      key: 'uuid',
      type: 'string',
    },
    {
      key: 'deleted_at',
      type: 'number',
    },
  ],
};

const expectedRequests: Record<
  Endpoint,
  {
    method: string;
    /** If true, assert auth headers */
    withAuth?: boolean;
    body?: ExpectedType;
  }
> = {
  '/auth/signup': {
    method: 'POST',
    body: {
      type: 'object',
      values: [
        {
          key: 'username',
          type: 'string',
        },
        {
          key: 'password',
          type: 'string',
        },
        {
          key: 'notes',
          type: 'array',
          values: expectedNoteType,
        },
      ],
    },
  },
  '/auth/login': {
    method: 'POST',
    body: {
      type: 'object',
      values: [
        {
          key: 'username',
          type: 'string',
        },
        {
          key: 'password',
          type: 'string',
        },
        {
          key: 'notes',
          type: 'array',
          values: expectedNoteType,
        },
        {
          key: 'deleted_notes',
          type: 'array',
          values: expectedDeletedNoteType,
        },
      ],
    },
  },
  '/auth/logout': {
    method: 'POST',
    withAuth: true,
  },
  '/notes/sync': {
    method: 'PUT',
    withAuth: true,
    body: {
      type: 'object',
      values: [
        {
          key: 'notes',
          type: 'array',
          values: expectedNoteType,
        },
        {
          key: 'deleted_notes',
          type: 'array',
          values: expectedDeletedNoteType,
        },
      ],
    },
  },
  '/account/delete': {
    method: 'DELETE',
    withAuth: true,
  },
  '/account/change-password': {
    method: 'PUT',
    withAuth: true,
    body: {
      type: 'object',
      values: [
        {
          key: 'current_password',
          type: 'string',
        },
        {
          key: 'new_password',
          type: 'string',
        },
        {
          key: 'notes',
          type: 'array',
          values: expectedNoteType,
        },
      ],
    },
  },
};
