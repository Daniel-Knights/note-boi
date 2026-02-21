import { DebounceQueue } from '../../../classes';

describe('DebounceQueue', () => {
  it('Debounces tasks with delay', () => {
    const dq = new DebounceQueue();
    const cb = vi.fn(() => Promise.resolve());

    vi.useFakeTimers();

    // Shouldn't be called at all - gets debounced
    dq.add(cb, 1000);

    vi.advanceTimersByTime(500);

    // Should be called after its delay
    dq.add(cb, 1000);

    expect(cb).not.toHaveBeenCalled(); // For the first add

    vi.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalledOnce(); // For the second add

    // Should be called after its delay
    dq.add(cb, 10);

    vi.advanceTimersByTime(10);
    vi.useRealTimers();

    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('Cancels previous task when adding a new task with delay', async () => {
    const dq = new DebounceQueue();
    const isCancelledReturnValues: boolean[] = [];

    let resolveFirstCall: () => void;

    const firstCallPromise = new Promise<void>((res) => {
      resolveFirstCall = res;
    });

    const cb = vi.fn((isCancelled) => {
      const callIndex = isCancelledReturnValues.length;

      isCancelledReturnValues.push(isCancelled());

      if (callIndex === 0) {
        return firstCallPromise.then(() => {
          isCancelledReturnValues.push(isCancelled());
        });
      }

      return Promise.resolve();
    });

    vi.useFakeTimers();

    // First call with delay
    dq.add(cb, 100);

    expect(cb).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(100);

    expect(cb).toHaveBeenCalledTimes(1);
    assert.strictEqual(isCancelledReturnValues[0], false);

    // Second call fires before first is complete - should cancel first
    dq.add(cb, 10);

    vi.advanceTimersByTime(10);

    expect(cb).toHaveBeenCalledTimes(2);

    vi.useRealTimers();

    // Resolve the first call to check cancellation status
    resolveFirstCall!();
    await firstCallPromise;

    assert.deepEqual(isCancelledReturnValues, [
      false, // First call start - not cancelled yet
      false, // Second call start - not cancelled
      true, // First call end - now cancelled
    ]);
  });

  it('Executes immediately when no delay is provided', () => {
    const dq = new DebounceQueue();
    const isCancelledReturnValues: boolean[] = [];
    const cb = vi.fn((isCancelled) => {
      isCancelledReturnValues.push(isCancelled());

      return Promise.resolve();
    });

    // First call - should execute immediately
    dq.add(cb);

    expect(cb).toHaveBeenCalledTimes(1);
    assert.strictEqual(isCancelledReturnValues[0], false);

    // Second call - should execute immediately
    dq.add(cb);

    expect(cb).toHaveBeenCalledTimes(2);
    assert.strictEqual(isCancelledReturnValues[1], false);
  });

  it('Cancels previous task when adding a new task without delay', async () => {
    const dq = new DebounceQueue();
    const isCancelledReturnValues: boolean[] = [];

    let resolveFirstCall: () => void;

    const firstCallPromise = new Promise<void>((res) => {
      resolveFirstCall = res;
    });

    const cb = vi.fn((isCancelled) => {
      const callIndex = isCancelledReturnValues.length;

      isCancelledReturnValues.push(isCancelled());

      if (callIndex === 0) {
        return firstCallPromise.then(() => {
          isCancelledReturnValues.push(isCancelled());
        });
      }

      return Promise.resolve();
    });

    // First call starts immediately
    dq.add(cb);

    expect(cb).toHaveBeenCalledTimes(1);
    assert.strictEqual(isCancelledReturnValues[0], false);

    // Second call fires before first is complete - should cancel first
    dq.add(cb);

    expect(cb).toHaveBeenCalledTimes(2);

    // Resolve the first call to check cancellation status
    resolveFirstCall!();
    await firstCallPromise;

    assert.deepEqual(isCancelledReturnValues, [
      false, // First call start - not cancelled yet
      false, // Second call start - not cancelled
      true, // First call end - now cancelled
    ]);
  });
});
