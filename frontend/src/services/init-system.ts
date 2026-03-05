/**
 * INICIALIZADOR DEL SISTEMA
 * Este archivo debe ejecutarse al inicio de la aplicación
 * 
 * Ubicación: src/services/init-system.ts
 */

import { inicializarSistema, estadisticasSistema } from './storage-service';

/**
 * Inicializa todo el sistema de persistencia
 * Debe llamarse en main.tsx o App.tsx antes de renderizar
 */
export const inicializarApp = (): void => {

  try {
    // Inicializar el sistema de almacenamiento
    inicializarSistema();

    // Mostrar estadísticas
    const stats = estadisticasSistema();

    // Mostrar información de usuarios de prueba

  } catch (error) {
    throw error;
  }
};

/**
 * Hook de desarrollo para resetear el sistema
 * Solo usar en desarrollo cuando necesites datos frescos
 */
export const resetearSistemaDesarrollo = (): void => {
  try {
    // Limpiar todo el localStorage
    localStorage.clear();
    window.location.reload();
  } catch (error) {
  }
};

// Exponer función global para debugging en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).resetKuHub = resetearSistemaDesarrollo;
  (window as any).statsKuHub = estadisticasSistema;

}