import { DebounceQueue } from '../../../classes';
import { wait } from '../../utils';

describe('DebounceQueue', () => {
  it('add', () => {
    const dq = new DebounceQueue();
    const cb = vi.fn(() => Promise.resolve());

    vi.useFakeTimers();

    dq.add(cb, 1000);
    dq.add(cb, 1000);

    const timeoutId = dq.add(cb, 1000);

    vi.advanceTimersByTime(1000);
    vi.useRealTimers();

    expect(cb).toHaveBeenCalledTimes(1);

    assert.isDefined(timeoutId);
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

  it('isCancelled', () => {
    const dq = new DebounceQueue();
    const cb = vi.fn(() => wait(1000));

    assert.isUndefined(dq.isCancelled(undefined));

    vi.useFakeTimers();

    let timeoutId = dq.add(cb, 1000);

    assert.isFalse(dq.isCancelled(timeoutId));

    dq.clear();

    assert.isFalse(dq.isCancelled(timeoutId));

    vi.advanceTimersByTime(1000);

    expect(cb).not.toHaveBeenCalled();

    vi.useFakeTimers();

    dq.add(cb, 1000);

    timeoutId = dq.add(cb, 1000);

    vi.advanceTimersByTime(1000);

    dq.clear();

    assert.isTrue(dq.isCancelled(timeoutId));

    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
  });
});
