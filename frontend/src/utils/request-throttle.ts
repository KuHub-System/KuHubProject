/**
 * Utilidad para espaciar solicitudes y evitar 429 (Too Many Requests)
 * Agrega un pequeño delay entre solicitudes para no sobrecargar el servidor
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ejecuta una función con un retraso mínimo
 * Útil para evitar picos de solicitudes simultáneas
 */
export const withDelay = async <T>(
  fn: () => Promise<T>,
  delayMs: number = 100
): Promise<T> => {
  const result = await fn();
  await delay(delayMs);
  return result;
};

/**
 * Ejecuta múltiples funciones async secuencialmente con delay entre ellas
 * Previene picos de solicitudes que causan 429 Too Many Requests
 */
export const sequentialWithDelay = async <T>(
  fns: Array<() => Promise<T>>,
  delayMs: number = 150
): Promise<T[]> => {
  const results: T[] = [];
  for (const fn of fns) {
    results.push(await withDelay(fn, delayMs));
  }
  return results;
};

/**
 * Ejecuta múltiples promises pero con control de concurrencia
 * Por defecto permite 2 solicitudes simultáneas
 */
export const parallelWithLimit = async <T>(
  promises: Array<() => Promise<T>>,
  concurrencyLimit: number = 2
): Promise<T[]> => {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < promises.length; i++) {
    const p = Promise.resolve()
      .then(() => promises[i]())
      .then(result => {
        results[i] = result;
      });

    executing.add(p);

    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
      executing.delete(p);
    }
  }

  await Promise.all(executing);
  return results;
};
