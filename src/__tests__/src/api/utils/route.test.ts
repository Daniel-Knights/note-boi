import * as s from '../../../../store/sync';
import { route } from '../../../../api/utils';
import { ERROR_CODE } from '../../../../classes';
import { assertAppError, assertLoadingState } from '../../../utils';

describe('route', () => {
  it('Handles unknown errors', async () => {
    const err = new Error('unexpected');
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const routeCb = vi.fn().mockRejectedValueOnce(err);
    const wrapped = route(routeCb);

    await assertLoadingState(async () => {
      const result = await wrapped('bar');

      expect(routeCb).toHaveBeenCalledWith('bar');
      expect(consoleErrorSpy).toHaveBeenCalledWith(`ERROR_CODE: ${ERROR_CODE.UNKNOWN}`);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Original error:');
      expect(consoleErrorSpy).toHaveBeenCalledWith(err);

      assertAppError({
        code: ERROR_CODE.UNKNOWN,
        originalError: err,
        retry: { args: ['bar'] },
        display: { form: true, sync: true },
      });

      assert.isUndefined(result);
    });

    vi.clearAllMocks();

    await assertLoadingState(async () => {
      await s.syncState.appError.retry();

      expect(routeCb).toHaveBeenCalledWith('bar');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
