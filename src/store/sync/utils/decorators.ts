import { nextTick } from 'vue';

import { AppError, ERROR_CODE } from '../../../classes';
import { syncState } from '../index';

/** Decorator for request calls that handles load state setting, and errors. */
export function route<T extends (...args: never[]) => Promise<Awaited<ReturnType<T>>>>(
  cb: T
) {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | void> => {
    syncState.loadingCount += 1;

    try {
      await nextTick(); // Ensure loading spinner shows

      const result = await cb(...args);

      return result;
    } catch (err) {
      if (err instanceof AppError) {
        syncState.appError = err;

        console.error(`ERROR_CODE: ${err.code}`);
        console.error(`Error message: ${err.message}`);
        console.error('Original error:');
        console.error(err.originalError);
      } else {
        syncState.appError = new AppError({
          code: ERROR_CODE.UNKNOWN,
          message: 'An unknown error occurred',
          originalError: err,
          display: { form: true, sync: true },
        });

        console.error(`ERROR_CODE: ${ERROR_CODE.UNKNOWN}`);
        console.error('Original error:');
        console.error(err);
      }
    } finally {
      syncState.loadingCount -= 1;
    }
  };
}
