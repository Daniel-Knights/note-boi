import { AppError, ERROR_CODE, ErrorConfig } from '../../../classes';

describe('AppError', () => {
  it('With default values', () => {
    const error = new AppError();

    assert.strictEqual(error.code, ERROR_CODE.NONE);
    assert.isUndefined(error.message);
    assert.isUndefined(error.display);
    assert.isUndefined(error.retryConfig);
  });

  it('With provided values', () => {
    const config = {
      code: ERROR_CODE.LOGIN,
      message: 'Login error',
      display: { form: true },
      retry: {
        fn: async () => {
          //
        },
      },
    } satisfies ErrorConfig<() => Promise<void>>;

    const error = new AppError(config);

    assert.strictEqual(error.code, ERROR_CODE.LOGIN);
    assert.strictEqual(error.message, 'Login error');
    assert.deepEqual(error.display, { form: true });
    assert.isFrozen(error.display);
    assert.deepEqual(error.retryConfig, { fn: config.retry.fn });
    assert.isFrozen(error.retryConfig);
  });

  describe('isNone', () => {
    it('Returns true when code is NONE', () => {
      const error = new AppError();

      assert.strictEqual(error.isNone, true);
    });

    it('Returns false when code is not NONE', () => {
      const error = new AppError({ code: ERROR_CODE.LOGIN });

      assert.strictEqual(error.isNone, false);
    });
  });

  describe('retry', () => {
    it('With no arguments', () => {
      const retryFn = vi.fn();
      const config: ErrorConfig<typeof retryFn> = {
        code: ERROR_CODE.SYNC,
        retry: { fn: retryFn },
      };
      const error = new AppError(config);

      error.retry();

      expect(retryFn).toHaveBeenCalledOnce();
      expect(retryFn).toHaveBeenCalledWith();
    });

    it('With provided arguments', () => {
      const retryFn = vi.fn();
      const config: ErrorConfig<typeof retryFn> = {
        code: ERROR_CODE.SYNC,
        retry: { fn: retryFn, args: [1, 2, 3] },
      };
      const error = new AppError(config);

      error.retry();

      expect(retryFn).toHaveBeenCalledOnce();
      expect(retryFn).toHaveBeenCalledWith(1, 2, 3);
    });

    it('Without retryConfig', () => {
      const error = new AppError();

      expect(() => error.retry()).not.toThrow();
    });
  });
});
