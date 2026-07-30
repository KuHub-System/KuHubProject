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
 *
 * Tipado como tupla heterogénea (cada función puede retornar un tipo distinto,
 * preservado por posición vía `Awaited<ReturnType<T[K]>>`) en vez de un array
 * homogéneo `Array<() => Promise<T>>`, porque los llamadores reales combinan
 * funciones con retornos distintos en el mismo arreglo (ver cargarDatosIniciales
 * en pedido-semanal-a-bodega.tsx).
 */
export const parallelWithLimit = async <T extends readonly (() => Promise<any>)[]>(
  promises: T,
  concurrencyLimit: number = 2
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> => {
  const results: any[] = [];
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
  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
};
