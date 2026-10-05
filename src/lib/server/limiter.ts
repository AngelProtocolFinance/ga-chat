type AttemptWindow = { count: number; reset_at: number };

export type AttemptResult = { allowed: true } | { allowed: false; retry_after_s: number };

export type AttemptLimiterOptions = {
  max_attempts: number;
  window_ms: number;
  max_keys: number;
  prune_interval_ms: number;
};

// in-memory, so limits hold per server instance only
export function create_attempt_limiter(options: AttemptLimiterOptions) {
  const { max_attempts, window_ms, max_keys, prune_interval_ms } = options;
  // insertion order is window-start order: a key is re-inserted whenever its window restarts
  const windows = new Map<string, AttemptWindow>();
  let last_prune = 0;

  function prune_expired(now: number) {
    last_prune = now;
    for (const [key, window] of windows) {
      if (window.reset_at <= now) windows.delete(key);
    }
  }

  function make_room(now: number) {
    if (windows.size < max_keys) return;
    prune_expired(now);
    if (windows.size < max_keys) return;
    const oldest = windows.keys().next().value;
    if (oldest !== undefined) windows.delete(oldest);
  }

  return {
    // counts the attempt up front so concurrent requests can't all slip past the check
    attempt(key: string, now = Date.now()): AttemptResult {
      if (now - last_prune >= prune_interval_ms) prune_expired(now);

      let window = windows.get(key);
      if (window && window.reset_at <= now) {
        windows.delete(key);
        window = undefined;
      }
      if (!window) {
        make_room(now);
        window = { count: 0, reset_at: now + window_ms };
        windows.set(key, window);
      }

      if (window.count >= max_attempts) {
        return { allowed: false, retry_after_s: Math.ceil((window.reset_at - now) / 1000) };
      }
      window.count++;
      return { allowed: true };
    },

    clear(key: string) {
      windows.delete(key);
    },
  };
}
