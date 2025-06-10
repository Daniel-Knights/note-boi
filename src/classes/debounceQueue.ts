/**
 * Queues and debounces async function calls.
 * If a function is cancelled after it has already begun executing, `isCancelled` can
 * be used to check if it should stop.
 */
export class DebounceQueue {
  #cancelled = new Map<number, { isRunning: boolean }>();
  #current: { id: number | null; isRunning: boolean } = {
    id: null,
    isRunning: false,
  };

  /**
   * Adds new task to the debounce queue.
   * If there is an existing task, it will be cleared.
   */
  add(cb: (isCancelled: () => boolean) => Promise<void>, delay?: number) {
    this.clear();

    const timeoutId = window.setTimeout(() => {
      if (timeoutId !== this.#current.id) return;

      this.#current.isRunning = true;

      cb(() => this.#isCancelled(timeoutId)).finally(() => {
        this.#cancelled.set(timeoutId, { isRunning: false });
      });
    }, delay);

    this.#current.id = timeoutId;
    this.#current.isRunning = false;
  }

  /**
   * Clears the current task in the debounce queue.
   * If the task is running, it will be marked as cancelled.
   */
  clear() {
    if (!this.#current.id) return;

    if (this.#current.isRunning) {
      this.#cancelled.set(this.#current.id, { isRunning: true });
    } else {
      window.clearTimeout(this.#current.id);

      this.#current.id = null;
    }
  }

  /**
   * Checks if task with the given timeout ID has been cancelled.
   */
  #isCancelled(timeoutId: number) {
    const cancelled = !!this.#cancelled.get(timeoutId);

    this.#cancelled.delete(timeoutId);

    return cancelled;
  }
}
