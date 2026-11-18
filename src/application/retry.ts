/** Reintenta fn con espera creciente. Relanza el último error si se agotan los intentos. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts: number; delayMs: number; sleep?: (ms: number) => Promise<void> },
): Promise<T> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastError: unknown;
  for (let i = 1; i <= opts.attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < opts.attempts) await sleep(opts.delayMs * i);
    }
  }
  throw lastError;
}
