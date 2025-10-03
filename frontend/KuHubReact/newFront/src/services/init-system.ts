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
  console.log('🚀 Iniciando sistema KüHub...');
  
  try {
    // Inicializar el sistema de almacenamiento
    inicializarSistema();
    
    // Mostrar estadísticas
    const stats = estadisticasSistema();
    console.log('📊 Estadísticas del sistema:');
    console.log(`   - Productos: ${stats.totalProductos}`);
    console.log(`   - Movimientos: ${stats.totalMovimientos}`);
    console.log(`   - Usuarios: ${stats.totalUsuarios}`);
    console.log(`   - Roles: ${stats.totalRoles}`);
    console.log(`   - Productos bajo stock: ${stats.productosBajoStock}`);
    
    // Mostrar información de usuarios de prueba
    console.log('\n👥 Usuarios de prueba disponibles:');
    console.log('   📧 admin@kuhub.cl - 🔑 admin123 (Admin completo)');
    console.log('   📧 coadmin@kuhub.cl - 🔑 coadmin123 (Co-Admin)');
    console.log('   📧 gestor@kuhub.cl - 🔑 gestor123 (Gestor de Pedidos)');
    console.log('   📧 profesor@kuhub.cl - 🔑 profesor123 (Profesor)');
    console.log('   📧 bodega@kuhub.cl - 🔑 bodega123 (Bodega)');
    console.log('   📧 asistente@kuhub.cl - 🔑 asistente123 (Asistente)');
    
    console.log('\n✅ Sistema inicializado correctamente\n');
  } catch (error) {
    console.error('❌ Error al inicializar el sistema:', error);
    throw error;
  }
};

/**
 * Hook de desarrollo para resetear el sistema
 * Solo usar en desarrollo cuando necesites datos frescos
 */
export const resetearSistemaDesarrollo = (): void => {
  if (import.meta.env.DEV) {
    const { resetearSistema } = require('./storage-service');
    resetearSistema();
    window.location.reload();
  } else {
    console.warn('⚠️ resetearSistema solo está disponible en modo desarrollo');
  }
};

// Exponer función global para debugging en consola del navegador
if (import.meta.env.DEV) {
  (window as any).resetKuHub = resetearSistemaDesarrollo;
  (window as any).statsKuHub = estadisticasSistema;
  
  console.log('🛠️ Funciones de desarrollo disponibles:');
  console.log('   - window.resetKuHub() - Resetea todo el sistema');
  console.log('   - window.statsKuHub() - Muestra estadísticas');
};