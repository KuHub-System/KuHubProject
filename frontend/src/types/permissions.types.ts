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
  | 'GESTION_RECETAS'
  | 'GESTION_ACADEMICA'
  | 'GESTION_ROLES'
  | 'GESTION_USUARIOS'
  | 'ADMIN_SISTEMA';

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

// ── Permiso de un rol sobre todos los módulos ─────────────────────────────────
export interface RolePermission {
  role:        string; // nombre del rol (ej. "Administrador")
  permissions: Record<ModuleKey, AccessLevel>;
}

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
  GESTION_RECETAS:           'Gestión de Recetas',
  GESTION_ACADEMICA:    'Gestión Académica',
  GESTION_ROLES:        'Gestión de Roles',
  GESTION_USUARIOS:     'Gestión de Usuarios',
  ADMIN_SISTEMA:        'Administración del Sistema',
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
  GESTION_RECETAS:           'lucide:chef-hat',
  GESTION_ACADEMICA:    'lucide:book-open',
  GESTION_ROLES:        'lucide:shield',
  GESTION_USUARIOS:     'lucide:users',
  ADMIN_SISTEMA:        'lucide:settings',
};

// ── Mapeo pageId (URL / roles-config) → ModuleKey (BD) ───────────────────────
// Permite que ProtectedRoute verifique el acceso contra la BD además del archivo estático.
export const PAGE_TO_MODULE: Record<string, ModuleKey> = {
  'dashboard':              'DASHBOARD',
  'inventario':             'INVENTARIO',
  'historial-movimientos':  'HISTORIAL_MOVIMIENTOS',
  'solicitud':              'SOLICITUD',
  'gestion-pedidos':      'GESTION_PEDIDOS',
  'gestion-solicitudes':  'GESTION_SOLICITUDES',
  'historico-pedidos':    'GESTION_PEDIDOS',
  'conglomerado-pedidos': 'CONGLOMERADO_PEDIDOS',
  'gestion-proveedores':  'GESTION_PROVEEDORES',
  'bodega-transito':      'BODEGA_TRANSITO',
  'gestion-recetas':      'GESTION_RECETAS',
  'gestion-academica':    'GESTION_ACADEMICA',
  'gestion-roles':        'GESTION_ROLES',
  'gestion-usuarios':     'GESTION_USUARIOS',
  'admin-sistema':        'ADMIN_SISTEMA',
};
