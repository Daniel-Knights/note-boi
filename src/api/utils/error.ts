import { AppError, ERROR_CODE, ErrorConfig } from '../../classes';

/** Catches hanging requests (e.g. due to server error). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throwFetchError<T extends (...args: any) => Promise<void>>(
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throwEncryptorError<T extends (...args: any) => Promise<void>>(
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
