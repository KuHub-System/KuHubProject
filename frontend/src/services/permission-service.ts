/**
 * SERVICIO DE PERMISOS GRANULARES
 *
 * Comunica con el backend para obtener y guardar la matriz de permisos
 * (Roles × Módulos con flags CRUD).
 *
 * Endpoints backend:
 *  GET  /api/v1/permisos/matrix        → Matriz completa (solo ADMINISTRADOR)
 *  PUT  /api/v1/permisos/{id}          → Actualizar permiso existente
 *  POST /api/v1/permisos               → Crear permiso nuevo
 */

import api from '../config/Axios';
import {
  AccessLevel,
  ModuleKey,
  PermisoMatrizDTO,
  PermisoRolRequestDTO,
  RolePermission,
} from '../types/permissions.types';

// ── Cache en memoria para la matriz (evita llamadas repetidas) ────────────────
let matrixCache: Record<string, PermisoMatrizDTO[]> | null = null;

// ── Mapeo ENUM-DB → nombre de display del frontend ───────────────────────────
// El backend almacena nombre_rol en formato ENUM (GESTOR_PEDIDOS),
// pero el frontend usa el nombre de display (Gestor de Pedidos).
// Esta tabla garantiza que siempre coincidan sin importar cómo esté guardado en la BD.
const DB_TO_DISPLAY_ROLE: Record<string, string> = {
  // Formato ENUM (mayúsculas con guión bajo)
  'ADMINISTRADOR':    'Administrador',
  'CO_ADMINISTRADOR': 'Co-Administrador',
  'GESTOR_PEDIDOS':   'Gestor de Pedidos',
  'PROFESOR_A_CARGO': 'Profesor a Cargo',
  'DOCENTE':          'Docente',
  'ENCARGADO_BODEGA': 'Encargado de Bodega',
  'ASISTENTE_BODEGA': 'Asistente de Bodega',
  // Formato display directo (si la BD ya guarda los nombres con tildes/espacios)
  'Administrador':      'Administrador',
  'Co-Administrador':   'Co-Administrador',
  'Gestor de Pedidos':  'Gestor de Pedidos',
  'Profesor a Cargo':   'Profesor a Cargo',
  'Docente':            'Docente',
  'Encargado de Bodega':'Encargado de Bodega',
  'Asistente de Bodega':'Asistente de Bodega',
};

/**
 * Normaliza el nombre de rol del backend al nombre de display del frontend.
 * Si no está en el mapa, devuelve el mismo valor (fallback seguro).
 */
const normalizeRoleName = (name: string): string => DB_TO_DISPLAY_ROLE[name] ?? name;

// ── Helpers de mapeo ──────────────────────────────────────────────────────────

/**
 * Convierte el nivelAcceso del backend al AccessLevel del frontend.
 */
const mapBackendToAccessLevel = (dto: PermisoMatrizDTO): AccessLevel => {
  if (dto.puedeCrear || dto.puedeActualizar || dto.puedeEliminar) return 'write';
  if (dto.puedeLeer) return 'read';
  return 'none';
};

/**
 * Convierte el codigoModulo del backend a ModuleKey.
 * Fallback al propio código si no existe en el enum.
 */
const toModuleKey = (codigoModulo: string): ModuleKey =>
  codigoModulo as ModuleKey;

// ── API del servicio ──────────────────────────────────────────────────────────

export const permissionService = {

  /**
   * Obtiene la matriz completa de permisos desde el backend y la convierte
   * en un array de RolePermission (una entrada por rol, con permisos de todos los módulos).
   */
  getPermissions: async (): Promise<RolePermission[]> => {
    const response = await api.get<Record<string, PermisoMatrizDTO[]>>('/permisos/matrix');
    matrixCache = response.data;

    // Pivotar: de "agrupado por módulo" a "agrupado por rol"
    const roleGroups: Record<string, RolePermission> = {};

    Object.values(matrixCache).flat().forEach((dto) => {
      const roleKey = normalizeRoleName(dto.nombreRol);
      const pageKey = toModuleKey(dto.codigoModulo);

      if (!roleGroups[roleKey]) {
        roleGroups[roleKey] = {
          role: roleKey,
          permissions: {} as Record<ModuleKey, AccessLevel>,
        };
      }

      roleGroups[roleKey].permissions[pageKey] = mapBackendToAccessLevel(dto);
    });

    return Object.values(roleGroups);
  },

  /**
   * Guarda los permisos actualizados enviando solo los cambios al backend.
   * Para cada celda de la matriz, detecta si cambió y hace PUT (existente) o POST (nuevo).
   */
  savePermissions: async (updatedPermissions: RolePermission[]): Promise<void> => {
    // Asegurar que el cache esté lleno
    if (!matrixCache) {
      await permissionService.getPermissions();
    }

    // Construir mapa de cache: "nombreRol-codigoModulo" → DTO
    const cacheMap = new Map<string, PermisoMatrizDTO>();
    Object.values(matrixCache!).flat().forEach((dto) => {
      cacheMap.set(`${normalizeRoleName(dto.nombreRol)}-${dto.codigoModulo}`, dto);
    });

    const promises: Promise<any>[] = [];

    for (const rp of updatedPermissions) {
      // Administrador siempre tiene control total — nunca se modifica vía esta función
      if (rp.role === 'Administrador') continue;

      for (const [pageKey, access] of Object.entries(rp.permissions)) {
        const cachedDTO = cacheMap.get(`${rp.role}-${pageKey}`);
        if (!cachedDTO) continue; // módulo no existe en BD → ignorar

        const intendedWrite = access === 'write';
        const intendedRead  = access === 'read' || intendedWrite;

        const currentRead  = cachedDTO.puedeLeer;
        const currentWrite = cachedDTO.puedeCrear || cachedDTO.puedeActualizar || cachedDTO.puedeEliminar;

        const changed =
          intendedRead  !== currentRead ||
          intendedWrite !== currentWrite;

        if (!changed) continue;

        const payload: PermisoRolRequestDTO = {
          idRol:           cachedDTO.idRol,
          idModulo:        cachedDTO.idModulo,
          puedeLeer:       intendedRead,
          puedeCrear:      intendedWrite,
          puedeActualizar: intendedWrite,
          puedeEliminar:   intendedWrite,
        };

        // Usar siempre el endpoint upsert (POST) para evitar problemas con PUT en proxies
        promises.push(api.post('/permisos/upsert', payload));
      }
    }

    await Promise.all(promises);

    // Invalidar cache para que la próxima lectura sea fresca
    matrixCache = null;
  },

  /**
   * Obtiene los permisos de un rol específico como mapa ModuleKey → AccessLevel.
   * Útil para cargar los permisos del usuario activo sin la matriz completa.
   */
  getPermissionsForRole: async (nombreRol: string): Promise<Record<ModuleKey, AccessLevel>> => {
    const all = await permissionService.getPermissions();
    const found = all.find((p) => p.role === nombreRol);
    return found?.permissions ?? ({} as Record<ModuleKey, AccessLevel>);
  },

  /** Restaura todos los permisos a los valores predeterminados del sistema. */
  restaurarPredeterminado: async (): Promise<void> => {
    await api.post('/permisos/restaurar-predeterminado');
    matrixCache = null;
  },

  /** Invalida el cache (útil tras guardar cambios). */
  invalidateCache: (): void => {
    matrixCache = null;
  },
};
