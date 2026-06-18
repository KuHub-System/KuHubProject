/**
 * TIPOS DEL SISTEMA DE PERMISOS GRANULARES (CRUD por módulo)
 *
 * Basado en el modelo de Clover, adaptado a KuHub.
 * Nivel de acceso: 'none' → 'read' → 'write' (jerarquía ascendente)
 */

// ── Claves de módulo (deben coincidir con codigo_modulo en la BD) ────────────
export type ModuleKey =
  | 'DASHBOARD'
  | 'INVENTARIO'
  | 'HISTORIAL_MOVIMIENTOS'
  | 'GESTION_CATEGORIAS'
  | 'GESTION_UNIDADES'
  | 'SOLICITUD'
  | 'GESTION_PEDIDOS'
  | 'GESTION_SOLICITUDES'
  | 'CONGLOMERADO_PEDIDOS'
  | 'GESTION_PROVEEDORES'
  | 'BODEGA_TRANSITO'
  | 'GESTION_PEDIDOS_DIARIOS'
  | 'PEDIDO_SEMANAL_BODEGA'
  // ── Acciones internas de Pedido Semanal a Bodega ──
  | 'PEDIDO_SEM_CREAR'
  | 'PEDIDO_SEM_EDITAR'
  | 'PEDIDO_SEM_INACTIVAR'
  | 'PEDIDO_SEM_ELIMINAR'
  // ── Acciones internas de Gestión de Solicitudes ──
  | 'GEST_SOL_GESTIONAR'
  | 'GEST_SOL_RECHAZAR'
  | 'GESTION_ACADEMICA'
  | 'GESTION_ROLES'
  | 'GESTION_USUARIOS'
  | 'ADMIN_SISTEMA'
  // ── Vistas (tabs) internas de Administración del Sistema ──
  | 'ADMIN_BLOQUES_HORARIOS'
  | 'ADMIN_SEMANAS'
  | 'ADMIN_SALAS_RESERVAS'
  | 'ADMIN_CONFIG_SISTEMA'
  // ── Vistas internas de Gestión de Pedidos ──
  | 'GP_VISTA_RESUMEN'
  | 'GP_VISTA_ACEPTADAS'
  // ── Vistas internas de Conglomerado de Pedidos ──
  | 'CONG_VISTA_APROBACION'
  | 'CONG_VISTA_CRONOGRAMA'
  | 'CONG_VISTA_TOTALES'
  | 'CONG_VISTA_CATEGORIAS'
  // ── Acciones internas de Conglomerado de Pedidos ──
  | 'CONG_APROBAR_PEDIDO'
  | 'CONG_RECHAZAR_PEDIDO'
  // ── Vista y acciones internas de Gestión de Proveedores ──
  | 'GPRV_NUEVO_PROV'
  | 'GPRV_SYNC_EXCEL'
  | 'GPRV_GENERAR_ORDEN'
  | 'GPRV_COTIZACION'
  | 'GPRV_CAMBIAR_ESTADO_PROV'
  | 'GPRV_EDITAR_PROV'
  | 'GPRV_ASIGNAR_PROD'
  | 'GPRV_ELIMINAR_PROV'
  | 'GPRV_ORDENES'
  | 'GPRV_CANCELAR_OP'
  | 'GPRV_EXPORT_OP'
  // ── Acciones internas de Inventario ──
  | 'INV_CONTROL_MASIVO'
  | 'INV_SYNC_EXCEL'
  | 'INV_ABASTECIMIENTO'
  // ── Acciones internas de Bodega de Tránsito ──
  | 'BOD_CONTROL_MASIVO'
  | 'BOD_ABASTECIMIENTO'
  // ── Histórico de Pedidos (página propia + acción) ──
  | 'HISTORICO_PEDIDOS'
  | 'HIST_EXPORT_EXCEL';

// ── Nivel de acceso (colapsa CRUD en tres niveles para la UI) ────────────────
export type AccessLevel = 'none' | 'read' | 'write';

// ── Jerarquía numérica para comparaciones ───────────────────────────────────
export const ACCESS_HIERARCHY: Record<AccessLevel, number> = {
  none:  0,
  read:  1,
  write: 2,
};

// ── Permisos CRUD por módulo (granular, viene del backend) ───────────────────
export interface ModulePermissions {
  puedeLeer:       boolean;
  puedeCrear:      boolean;
  puedeActualizar: boolean;
  puedeEliminar:   boolean;
}

// ── Permiso de un rol sobre todos los módulos (CRUD granular real) ───────────
export interface RolePermission {
  role:        string; // nombre del rol (ej. "Administrador")
  permissions: Record<ModuleKey, ModulePermissions>;
}

// ── Helpers para colapsar/expandir entre CRUD granular y nivel de la UI ───────
export const emptyModulePermissions = (): ModulePermissions => ({
  puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
});

/** Deriva el nivel resumido (none/read/write) a partir de los 4 flags CRUD. */
export const levelFromPermissions = (p?: ModulePermissions): AccessLevel => {
  if (!p) return 'none';
  if (p.puedeCrear || p.puedeActualizar || p.puedeEliminar) return 'write';
  if (p.puedeLeer) return 'read';
  return 'none';
};

// ── DTO que viene del backend (matriz plana por módulo) ──────────────────────
export interface PermisoMatrizDTO {
  idRol:           number;
  nombreRol:       string;
  idModulo:        number;
  codigoModulo:    string;
  nombreModulo:    string;
  ordenModulo:     number;
  idPermisoRol:    number | null;
  nivelAcceso:     'ESCRITURA' | 'LECTURA' | 'SIN_ACCESO';
  puedeLeer:       boolean;
  puedeCrear:      boolean;
  puedeActualizar: boolean;
  puedeEliminar:   boolean;
}

// ── Request al backend para crear/actualizar permiso ─────────────────────────
export interface PermisoRolRequestDTO {
  idRol:           number;
  idModulo:        number;
  puedeLeer:       boolean;
  puedeCrear:      boolean;
  puedeActualizar: boolean;
  puedeEliminar:   boolean;
}

// ── Mapeo de código de módulo (backend) → etiqueta legible (frontend) ────────
export const MODULE_LABELS: Record<ModuleKey, string> = {
  DASHBOARD:             'Dashboard',
  INVENTARIO:            'Inventario',
  HISTORIAL_MOVIMIENTOS: 'Historial / Movimientos',
  GESTION_CATEGORIAS:    'Gestión de Categorías',
  GESTION_UNIDADES:      'Gestión de Unidades',
  SOLICITUD:            'Solicitudes',
  GESTION_PEDIDOS:      'Gestión de Pedidos',
  GESTION_SOLICITUDES:  'Gestión de Solicitudes',
  CONGLOMERADO_PEDIDOS: 'Conglomerado de Pedidos',
  GESTION_PROVEEDORES:  'Gestión de Proveedores',
  BODEGA_TRANSITO:           'Bodega de Tránsito',
  GESTION_PEDIDOS_DIARIOS:   'Gestión de Pedidos Diarios',
  PEDIDO_SEMANAL_BODEGA:      'Pedido Semanal a Bodega',
  PEDIDO_SEM_CREAR:      'Pedido Sem. · Nuevo Pedido',
  PEDIDO_SEM_EDITAR:     'Pedido Sem. · Editar Pedido',
  PEDIDO_SEM_INACTIVAR:  'Pedido Sem. · Inactivar Pedido',
  PEDIDO_SEM_ELIMINAR:   'Pedido Sem. · Eliminar Pedido',
  GEST_SOL_GESTIONAR:    'G. Solicitudes · Gestionar Estados',
  GEST_SOL_RECHAZAR:     'G. Solicitudes · Rechazar',
  GESTION_ACADEMICA:    'Gestión Académica',
  GESTION_ROLES:        'Gestión de Roles',
  GESTION_USUARIOS:     'Gestión de Usuarios',
  ADMIN_SISTEMA:        'Administración del Sistema',
  ADMIN_BLOQUES_HORARIOS: 'Adm. Sistema · Bloques Horarios',
  ADMIN_SEMANAS:          'Adm. Sistema · Gestión de Semanas',
  ADMIN_SALAS_RESERVAS:   'Adm. Sistema · Salas y Reservas',
  ADMIN_CONFIG_SISTEMA:   'Adm. Sistema · Configuración',
  GP_VISTA_RESUMEN:       'G. Pedidos · Resumen de Productos',
  GP_VISTA_ACEPTADAS:     'G. Pedidos · Solicitudes Aceptadas',
  CONG_VISTA_APROBACION:  'Conglom. · Aprobación de Pedidos',
  CONG_VISTA_CRONOGRAMA:  'Conglom. · Cronograma Semanal',
  CONG_VISTA_TOTALES:     'Conglom. · Totales del Pedido',
  CONG_VISTA_CATEGORIAS:  'Conglom. · Por Categoría',
  CONG_APROBAR_PEDIDO:    'Conglom. · Aprobar Pedido',
  CONG_RECHAZAR_PEDIDO:   'Conglom. · Rechazar Pedido',
  GPRV_NUEVO_PROV:          'G. Proveedores · Nuevo Proveedor',
  GPRV_SYNC_EXCEL:          'G. Proveedores · Sincronizar Excel',
  GPRV_GENERAR_ORDEN:       'G. Proveedores · Generar Orden Pedido',
  GPRV_COTIZACION:          'G. Proveedores · Proyección Cotización',
  GPRV_CAMBIAR_ESTADO_PROV: 'G. Proveedores · Cambiar Estado Prov',
  GPRV_EDITAR_PROV:         'G. Proveedores · Editar Proveedor',
  GPRV_ASIGNAR_PROD:        'G. Proveedores · Asignar Producto',
  GPRV_ELIMINAR_PROV:       'G. Proveedores · Eliminar Proveedor',
  GPRV_ORDENES:             'G. Proveedores · Órdenes de Pedido',
  GPRV_CANCELAR_OP:         'G. Proveedores · Cancelar Orden OP',
  GPRV_EXPORT_OP:           'G. Proveedores · Exportar Excel OP',
  INV_CONTROL_MASIVO:       'Inventario · Control Masivo',
  INV_SYNC_EXCEL:           'Inventario · Sincronizar Excel',
  INV_ABASTECIMIENTO:       'Inventario · Gestión Abastecimiento',
  BOD_CONTROL_MASIVO:       'Bodega · Control Masivo',
  BOD_ABASTECIMIENTO:       'Bodega · Gestión Abastecimiento',
  HISTORICO_PEDIDOS:        'Histórico de Pedidos',
  HIST_EXPORT_EXCEL:        'Histórico · Exportar Excel',
};

// ── Icono sugerido por módulo (iconify/lucide) ────────────────────────────────
export const MODULE_ICONS: Record<ModuleKey, string> = {
  DASHBOARD:             'lucide:layout-dashboard',
  INVENTARIO:            'lucide:package',
  HISTORIAL_MOVIMIENTOS: 'lucide:history',
  GESTION_CATEGORIAS:    'lucide:tags',
  GESTION_UNIDADES:      'lucide:scale',
  SOLICITUD:            'lucide:file-text',
  GESTION_PEDIDOS:      'lucide:shopping-cart',
  GESTION_SOLICITUDES:  'lucide:clipboard-list',
  CONGLOMERADO_PEDIDOS: 'lucide:layers',
  GESTION_PROVEEDORES:  'lucide:truck',
  BODEGA_TRANSITO:           'lucide:warehouse',
  GESTION_PEDIDOS_DIARIOS:   'lucide:shopping-cart',
  PEDIDO_SEMANAL_BODEGA:      'lucide:package-open',
  PEDIDO_SEM_CREAR:      'lucide:plus-circle',
  PEDIDO_SEM_EDITAR:     'lucide:pencil',
  PEDIDO_SEM_INACTIVAR:  'lucide:power',
  PEDIDO_SEM_ELIMINAR:   'lucide:trash-2',
  GEST_SOL_GESTIONAR:    'lucide:check-circle',
  GEST_SOL_RECHAZAR:     'lucide:x-circle',
  GESTION_ACADEMICA:    'lucide:book-open',
  GESTION_ROLES:        'lucide:shield',
  GESTION_USUARIOS:     'lucide:users',
  ADMIN_SISTEMA:        'lucide:settings',
  ADMIN_BLOQUES_HORARIOS: 'lucide:clock-4',
  ADMIN_SEMANAS:          'lucide:calendar-range',
  ADMIN_SALAS_RESERVAS:   'lucide:calendar-clock',
  ADMIN_CONFIG_SISTEMA:   'lucide:sliders-horizontal',
  GP_VISTA_RESUMEN:       'lucide:package-check',
  GP_VISTA_ACEPTADAS:     'lucide:clipboard-check',
  CONG_VISTA_APROBACION:  'lucide:shield-check',
  CONG_VISTA_CRONOGRAMA:  'lucide:calendar-range',
  CONG_VISTA_TOTALES:     'lucide:package-check',
  CONG_VISTA_CATEGORIAS:  'lucide:tag',
  CONG_APROBAR_PEDIDO:    'lucide:check-circle-2',
  CONG_RECHAZAR_PEDIDO:   'lucide:x-circle',
  GPRV_NUEVO_PROV:          'lucide:plus-circle',
  GPRV_SYNC_EXCEL:          'lucide:upload-cloud',
  GPRV_GENERAR_ORDEN:       'lucide:clipboard-list',
  GPRV_COTIZACION:          'lucide:file-spreadsheet',
  GPRV_CAMBIAR_ESTADO_PROV: 'lucide:toggle-right',
  GPRV_EDITAR_PROV:         'lucide:edit',
  GPRV_ASIGNAR_PROD:        'lucide:package-plus',
  GPRV_ELIMINAR_PROV:       'lucide:trash-2',
  GPRV_ORDENES:             'lucide:shopping-bag',
  GPRV_CANCELAR_OP:         'lucide:x-circle',
  GPRV_EXPORT_OP:           'lucide:download',
  INV_CONTROL_MASIVO:       'lucide:arrow-right-left',
  INV_SYNC_EXCEL:           'lucide:upload-cloud',
  INV_ABASTECIMIENTO:       'lucide:boxes',
  BOD_CONTROL_MASIVO:       'lucide:arrow-right-left',
  BOD_ABASTECIMIENTO:       'lucide:boxes',
  HISTORICO_PEDIDOS:        'lucide:bar-chart-2',
  HIST_EXPORT_EXCEL:        'lucide:download',
};

// ── Mapeo pageId (URL / roles-config) → ModuleKey (BD) ───────────────────────
// Permite que ProtectedRoute verifique el acceso contra la BD además del archivo estático.
// Cuando el valor es un array, el acceso se concede si CUALQUIERA de los módulos tiene lectura.
export const PAGE_TO_MODULE: Record<string, ModuleKey | ModuleKey[]> = {
  'dashboard':              'DASHBOARD',
  'inventario':             'INVENTARIO',
  'historial-movimientos':  'HISTORIAL_MOVIMIENTOS',
  'solicitud':              'SOLICITUD',
  'gestion-pedidos':      'GESTION_PEDIDOS',
  'gestion-solicitudes':  'GESTION_SOLICITUDES',
  'historico-pedidos':    'HISTORICO_PEDIDOS',
  'conglomerado-pedidos': 'CONGLOMERADO_PEDIDOS',
  'gestion-proveedores':  ['GESTION_PROVEEDORES', 'GPRV_ORDENES'],
  'bodega-transito':      'BODEGA_TRANSITO',
  'pedido-semanal-a-bodega': 'PEDIDO_SEMANAL_BODEGA',
  'gestion-academica':    ['GESTION_ACADEMICA', 'ADMIN_SALAS_RESERVAS'],
  'gestion-roles':        'GESTION_ROLES',
  'gestion-usuarios':     'GESTION_USUARIOS',
  'admin-sistema':        'ADMIN_SISTEMA',
};
