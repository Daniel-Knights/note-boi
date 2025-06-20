import { AppError, ERROR_CODE, ErrorConfig, RetryFn } from '../../classes';

/** Catches hanging requests (e.g. due to server error). */
export function throwFetchError<T extends RetryFn>(
  errorConfig: Omit<ErrorConfig<T>, 'message'>,
  originalError: unknown
): void {
  throw new AppError({
    ...errorConfig,
    message: 'Request failed',
    originalError,
  });
}

/** Catches note encryption errors. */
export function throwEncryptorError<T extends RetryFn>(
  errorConfig: Omit<ErrorConfig<T>, 'code' | 'message'>,
  originalError: unknown
): void {
  throw new AppError({
    ...errorConfig,
    code: ERROR_CODE.ENCRYPTOR,
    message: 'Note encryption/decryption failed',
    originalError,
  });
}
