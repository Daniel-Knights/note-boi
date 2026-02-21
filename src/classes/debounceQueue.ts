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
  add(cb: DebounceQueueCallback, delay?: number) {
    this.#clear();

    if (delay) {
      const timeoutId = window.setTimeout(() => {
        this.#run(timeoutId, cb);
      }, delay);

      this.#current.id = timeoutId;
      this.#current.isRunning = false;
    } else {
      const taskId = window.setTimeout(() => {
        // noop
      });

      this.#current.id = taskId;
      this.#run(taskId, cb);
    }
  }

  /**
   * Clears the current task in the debounce queue.
   * If the task is running, it will be marked as cancelled.
   */
  #clear() {
    if (!this.#current.id) return;

    if (this.#current.isRunning) {
      this.#cancelled.set(this.#current.id, { isRunning: true });
    } else {
      window.clearTimeout(this.#current.id);

      this.#current.id = null;
    }
  }

  #run(id: number, cb: DebounceQueueCallback) {
    if (id !== this.#current.id) return;

    this.#current.isRunning = true;

    cb(() => this.#isCancelled(id)).finally(() => {
      this.#cancelled.set(id, { isRunning: false });

      if (this.#current.id === id) {
        this.#current.isRunning = false;
      }
    });
  }

  /**
   * Checks if task with the given ID has been cancelled.
   */
  #isCancelled(id: number) {
    const cancelled = !!this.#cancelled.get(id);

    this.#cancelled.delete(id);

    return cancelled;
  }
}

//// Types

type DebounceQueueCallback = (isCancelled: () => boolean) => Promise<void>;
