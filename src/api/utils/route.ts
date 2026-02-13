import { nextTick } from 'vue';

import { AppError, ERROR_CODE } from '../../classes';

type RouteState = {
  loadingCount: number;
  appError: AppError;
};

/**
 * Creates a route decorator that handles load state setting, and errors.
 */
export function createRoute(state: RouteState) {
  /**
   * Decorator for request calls that handles load state setting, and errors.
   */
  return function route<T extends (...args: never[]) => Promise<Awaited<ReturnType<T>>>>(
    cb: T
  ) {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | void> => {
      state.loadingCount += 1;

      try {
        await nextTick(); // Ensure loading spinner shows

        const result = await cb(...args);

        return result;
      } catch (err) {
        if (err instanceof AppError) {
          state.appError = err;

          console.error(`ERROR_CODE: ${err.code}`);
          console.error(`Error message: ${err.message}`);
          console.error('Original error:');
          console.error(err.originalError);
        } else {
          state.appError = new AppError({
            code: ERROR_CODE.UNKNOWN,
            message: 'An unknown error occurred',
            originalError: err,
            retry: { fn: route(cb), args },
            display: { form: true, sync: true },
          });

          console.error(`ERROR_CODE: ${ERROR_CODE.UNKNOWN}`);
          console.error('Original error:');
          console.error(err);
        }
      } finally {
        state.loadingCount -= 1;
      }
    };
  };
}
