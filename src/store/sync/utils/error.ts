import { AppError, ERROR_CODE, ErrorConfig } from '../../../classes';
import { syncState } from '../index';

/** Resets {@link syncState.appError}. */
export function resetAppError(): void {
  syncState.appError = new AppError();
}

/** Catches hanging requests (e.g. due to server error). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function catchHang<T extends (...args: any) => void>(
  errorConfig: Omit<ErrorConfig<T>, 'message'>,
  originalError: unknown
): void {
  syncState.isLoading = false;
  syncState.appError = new AppError({
    message: 'Request failed',
    ...errorConfig,
  });

  console.error(`ERROR_CODE: ${errorConfig.code}`);
  console.error(originalError);
}

/** Catches note encryption errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function catchEncryptorError<T extends (...args: any) => void>(
  errorConfig: Omit<ErrorConfig<T>, 'code' | 'message'>,
  originalError: unknown
): void {
  syncState.isLoading = false;
  syncState.appError = new AppError({
    ...errorConfig,
    code: ERROR_CODE.ENCRYPTOR,
    message: 'Note encryption/decryption failed',
  });

  console.error(`ERROR_CODE: ${ERROR_CODE.ENCRYPTOR}`);
  console.error(originalError);
}
