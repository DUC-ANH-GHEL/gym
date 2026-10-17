// Tiny client-side store: how many sets the user finished that the server has not confirmed yet.
// Header counters add it to the server number, and reset it as soon as fresh server data arrives.
let delta = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export const todayOptimisticStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return delta;
  },
  getServerSnapshot() {
    return 0;
  },
  add(amount: number) {
    delta += amount;
    emit();
  },
  reset() {
    if (delta !== 0) {
      delta = 0;
      emit();
    }
  },
};
