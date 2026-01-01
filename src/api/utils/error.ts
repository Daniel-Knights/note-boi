import { AppError, Dialog, ERROR_CODE, ErrorConfig } from '../../classes';
import { clientSideLogout } from '../auth';

export function throwFetchError(
  errorConfig: Omit<ErrorConfig, 'message'>,
  originalError: unknown
): never {
  throw new AppError({
    ...errorConfig,
    message: 'Request failed',
    originalError,
  });
}

export function throwEncryptorError(
  errorConfig: Omit<ErrorConfig, 'code' | 'message'>,
  originalError: unknown
): never {
  throw new AppError({
    ...errorConfig,
    code: ERROR_CODE.ENCRYPTOR,
    message: 'Note encryption/decryption failed',
    originalError,
  });
}

export function throwAuthorisationError(
  errorConfig: Omit<ErrorConfig, 'code' | 'message'>,
  originalError?: unknown
): never {
  throw new AppError({
    ...errorConfig,
    code: ERROR_CODE.AUTHORISATION,
    message: 'Authorisation error',
    originalError,
  });
}

export function handleStoreKeyError(err: unknown, dialogTitle: string): never {
  console.error('Unable to store encryption key');
  console.error(err);

  Dialog.message('Unable to store encryption key. Please try again.', {
    kind: 'error',
    title: dialogTitle,
  });

  clientSideLogout();

  throw new Error('Unable to store encryption key');
}
