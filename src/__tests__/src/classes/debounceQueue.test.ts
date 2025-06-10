import { DebounceQueue } from '../../../classes';

describe('DebounceQueue', () => {
  it('add', () => {
    const dq = new DebounceQueue();
    const isCancelledReturnValues: boolean[] = [];
    const cb = vi.fn((isCancelled) => {
      isCancelledReturnValues.push(isCancelled());

      setTimeout(() => {
        isCancelledReturnValues.push(isCancelled());
      }, 500);

      return Promise.resolve();
    });

    vi.useFakeTimers();

    // Shouldn't be called at all
    dq.add(cb, 1000);

    vi.advanceTimersByTime(500);

    // Should be called, but cancelled partway through
    dq.add(cb, 1000);

    expect(cb).not.toHaveBeenCalled(); // For the first add

    vi.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalled(); // For the second add

    // Should be called, cancelling the previous call, and not get cancelled
    dq.add(cb, 10);

    vi.advanceTimersByTime(10);
    vi.advanceTimersByTime(500);
    vi.useRealTimers();

    expect(cb).toHaveBeenCalledTimes(2);

    assert.deepEqual(isCancelledReturnValues, [
      false, // First call, not cancelled
      false, // Second call, not cancelled
      true, // First call after wait, cancelled
      false, // Second call after wait, not cancelled
    ]);
  });

  it('clear', () => {
    const dq = new DebounceQueue();
    const cb = vi.fn(() => Promise.resolve());

    vi.useFakeTimers();

    dq.add(cb, 1000);
    dq.add(cb, 1000);
    dq.add(cb, 1000);

    dq.clear();

    vi.advanceTimersByTime(1000);
    vi.useRealTimers();

    expect(cb).not.toHaveBeenCalled();
  });
});
