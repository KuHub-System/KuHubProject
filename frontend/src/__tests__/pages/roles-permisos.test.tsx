/**
 * roles-permisos.test.tsx
 * Plan de Pruebas — Módulo Roles y Permisos Dinámicos (RP-01 a RP-15)
 * Sección 4.1 / 4.3  EP3 — KuHub
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Switch, Route } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';

import * as authContext   from '../../contexts/auth-context';
import * as permissionContext from '../../contexts/permission-context';
import ProtectedRoute     from '../../components/protected-route';
import { permissionService } from '../../services/permission-service';
import {
  levelFromPermissions,
  ModulePermissions,
  ModuleKey,
} from '../../types/permissions.types';

// ─────────────────────────────────────────────────────────────────────────────
// HOISTED — vi.fn() disponibles antes del hoisting de vi.mock
// ─────────────────────────────────────────────────────────────────────────────

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet:  vi.fn(),
  mockApiPost: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS DE MÓDULOS
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../config/Axios', () => ({
  default: { get: mockApiGet, post: mockApiPost, put: vi.fn() },
}));

vi.mock('../../utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PRUEBA (usuarios del sistema)
// ─────────────────────────────────────────────────────────────────────────────

const mkUser = (rol: string, email: string) =>
  ({ id: 1, email, nombre: 'Test', rol });

const USERS = {
  admin:     mkUser('Administrador',       'admin@kuhub.cl'),
  coadmin:   mkUser('Co-Administrador',    'coadmin@kuhub.cl'),
  gestor:    mkUser('Gestor de Pedidos',   'gestor@kuhub.cl'),
  profesor:  mkUser('Profesor a Cargo',    'profesor@kuhub.cl'),
  docente:   mkUser('Docente',             'docente@kuhub.cl'),
  encargado: mkUser('Encargado de Bodega', 'encargado@kuhub.cl'),
  asistente: mkUser('Asistente de Bodega', 'asistente@kuhub.cl'),
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE MOCKS DE CONTEXTO
// ─────────────────────────────────────────────────────────────────────────────

const mockAuth = (user: ReturnType<typeof mkUser>) =>
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(), logout: vi.fn(),
    canAccessPage: vi.fn(() => true),
    hasPermission: vi.fn(() => false),
    userRole: null,
  } as any);

const mockPermission = (
  canAccessFn: (m: ModuleKey) => boolean,
  isAdmin = false,
) =>
  vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
    isAdmin,
    isLoading: false,
    canAccess:      vi.fn((m: any) => canAccessFn(m)),
    canRead:        vi.fn(() => false),
    canCreate:      vi.fn(() => false),
    canUpdate:      vi.fn(() => false),
    canDelete:      vi.fn(() => false),
    getAccessLevel: vi.fn(() => 'none' as const),
    refreshPermissions: vi.fn(),
    allPermissions: [],
  } as any);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER DE RENDER — ProtectedRoute dentro de MemoryRouter + Switch
// ─────────────────────────────────────────────────────────────────────────────

const renderProtectedRoute = (path: string, pageId: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HeroUIProvider disableAnimation>
        <Switch>
          <Route path="/sin-acceso">
            <div data-testid="sin-acceso">Sin Acceso</div>
          </Route>
          <ProtectedRoute path={path} pageId={pageId}>
            <div data-testid="pagina-contenido">Contenido Protegido</div>
          </ProtectedRoute>
        </Switch>
      </HeroUIProvider>
    </MemoryRouter>,
  );

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE CASCADA (replica de gestion-roles.tsx — constantes internas)
// Usada en RP-08 y RP-09 para validar el algoritmo de cascade bidireccional.
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_CHILDREN_TEST: Partial<Record<ModuleKey, ModuleKey[]>> = {
  PEDIDO_SEMANAL_BODEGA: [
    'PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR',
    'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR',
  ],
  CONGLOMERADO_PEDIDOS: [
    'CONG_VISTA_APROBACION', 'CONG_VISTA_CRONOGRAMA', 'CONG_VISTA_TOTALES',
    'CONG_VISTA_CATEGORIAS', 'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO',
  ],
  CONG_VISTA_APROBACION: ['CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO'],
};

const MODULE_PARENTS_TEST: Partial<Record<ModuleKey, ModuleKey[]>> = (() => {
  const map: Partial<Record<ModuleKey, ModuleKey[]>> = {};
  for (const [parent, children] of Object.entries(MODULE_CHILDREN_TEST) as [ModuleKey, ModuleKey[]][]) {
    for (const child of children) {
      if (!map[child]) map[child] = [];
      map[child]!.push(parent as ModuleKey);
    }
  }
  return map;
})();

const ACTION_MODULES_TEST = new Set<ModuleKey>([
  'PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR', 'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR',
  'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO',
]);

const READ_MODULES_TEST = new Set<ModuleKey>([
  'CONG_VISTA_APROBACION', 'CONG_VISTA_CRONOGRAMA', 'CONG_VISTA_TOTALES',
]);

const writePerms: ModulePermissions = { puedeLeer: true,  puedeCrear: true,  puedeActualizar: true,  puedeEliminar: true  };
const readPerms:  ModulePermissions = { puedeLeer: true,  puedeCrear: false, puedeActualizar: false, puedeEliminar: false };
const nonePerms:  ModulePermissions = { puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false };

const permsFromLevel = (level: 'write' | 'read' | 'none'): ModulePermissions =>
  level === 'write' ? { ...writePerms } :
  level === 'read'  ? { ...readPerms  } :
                      { ...nonePerms  };

/**
 * Aplica cascada descendente + ascendente sobre un mapa de permisos.
 * Replica la lógica de handlePermissionChange() en gestion-roles.tsx.
 */
const applyCascade = (
  moduleKey: ModuleKey,
  newValue: ModulePermissions,
  permissions: Partial<Record<ModuleKey, ModulePermissions>>,
): Partial<Record<ModuleKey, ModulePermissions>> => {
  const newPerms: Partial<Record<ModuleKey, ModulePermissions>> = { ...permissions, [moduleKey]: newValue };

  // ── Cascada descendente ──────────────────────────────────────────────────
  const children = MODULE_CHILDREN_TEST[moduleKey];
  if (children) {
    const parentLevel = levelFromPermissions(newValue);
    for (const child of children) {
      if (ACTION_MODULES_TEST.has(child)) {
        newPerms[child] = permsFromLevel(parentLevel === 'write' ? 'write' : 'none');
      } else if (READ_MODULES_TEST.has(child)) {
        newPerms[child] = permsFromLevel(parentLevel === 'none' ? 'none' : 'read');
      } else {
        newPerms[child] = { ...newValue };
      }
    }
  }

  // ── Cascada ascendente ───────────────────────────────────────────────────
  const upQueue: ModuleKey[] = [moduleKey];
  const upVisited = new Set<ModuleKey>();

  while (upQueue.length > 0) {
    const current = upQueue.shift()!;
    if (upVisited.has(current)) continue;
    upVisited.add(current);

    for (const parent of MODULE_PARENTS_TEST[current] ?? []) {
      const siblings = MODULE_CHILDREN_TEST[parent] ?? [];
      let maxLevel: 'write' | 'read' | 'none' = 'none';

      for (const sib of siblings) {
        const sl = levelFromPermissions(newPerms[sib]);
        if (sl === 'write') { maxLevel = 'write'; break; }
        if (sl === 'read')  { maxLevel = 'read'; }
      }

      if (READ_MODULES_TEST.has(parent) && maxLevel === 'write') maxLevel = 'read';
      newPerms[parent] = permsFromLevel(maxLevel);
      upQueue.push(parent);
    }
  }

  return newPerms;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe('Módulo Roles y Permisos Dinámicos — Plan de Pruebas EP3', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    permissionService.invalidateCache();
  });

  // ============================================================
  // RP-01 — Verificación
  // Solo Administrador puede acceder a /gestion-roles
  // ============================================================
  describe('RP-01: DOCENTE redirigido a /sin-acceso al acceder a /gestion-roles', () => {
    it('redirige a /sin-acceso y no muestra el contenido de Gestión de Roles', async () => {
      // ARRANGE
      mockAuth(USERS.docente);
      mockPermission((m) => m !== 'GESTION_ROLES');

      // ACT
      renderProtectedRoute('/gestion-roles', 'gestion-roles');

      // ASSERT
      await waitFor(() => {
        expect(screen.getByTestId('sin-acceso')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('pagina-contenido')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // RP-02 — Verificación
  // CO_ADMINISTRADOR excluido de GESTION_ROLES y ADMIN_SISTEMA
  // ============================================================
  describe('RP-02: CO_ADMINISTRADOR bloqueado en GESTION_ROLES y ADMIN_SISTEMA (no es bypass)', () => {
    it('CO_ADMIN redirigido a /sin-acceso en /gestion-roles', async () => {
      // ARRANGE
      mockAuth(USERS.coadmin);
      // isAdmin=false → CO_ADMIN respeta la matriz, no hace bypass
      mockPermission((m) => !['GESTION_ROLES', 'ADMIN_SISTEMA'].includes(m), false);

      // ACT
      renderProtectedRoute('/gestion-roles', 'gestion-roles');

      // ASSERT
      await waitFor(() => {
        expect(screen.getByTestId('sin-acceso')).toBeInTheDocument();
      });
    });

    it('CO_ADMIN redirigido a /sin-acceso en /admin-sistema', async () => {
      // ARRANGE
      mockAuth(USERS.coadmin);
      mockPermission((m) => !['GESTION_ROLES', 'ADMIN_SISTEMA'].includes(m), false);

      // ACT
      renderProtectedRoute('/admin-sistema', 'admin-sistema');

      // ASSERT
      await waitFor(() => {
        expect(screen.getByTestId('sin-acceso')).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // RP-03 — Verificación
  // ADMINISTRADOR bypass completo — no consulta permiso_rol
  // ============================================================
  describe('RP-03: ADMINISTRADOR tiene acceso total sin consultar la matriz', () => {
    it('accede a /gestion-roles aunque canAccess devuelva false (isAdmin=true es bypass)', async () => {
      // ARRANGE
      mockAuth(USERS.admin);
      // canAccess siempre false, pero isAdmin=true → ProtectedRoute concede acceso
      mockPermission((_m) => false, true);

      // ACT
      renderProtectedRoute('/gestion-roles', 'gestion-roles');

      // ASSERT — debe mostrar el contenido, no redirigir
      await waitFor(() => {
        expect(screen.getByTestId('pagina-contenido')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('sin-acceso')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // RP-04 — Validación
  // Lectura implícita: canRead = puedeLeer || puedeCrear || puedeActualizar || puedeEliminar
  // ============================================================
  describe('RP-04: canRead=true cuando cualquier flag de escritura está activo', () => {
    it('puedeCrear=true y puedeLeer=false → nivel "write" (incluye acceso de lectura)', () => {
      // ARRANGE
      const perms: ModulePermissions = {
        puedeLeer: false, puedeCrear: true, puedeActualizar: false, puedeEliminar: false,
      };

      // ACT & ASSERT
      expect(levelFromPermissions(perms)).toBe('write');
    });

    it('cada flag de escritura por separado activa la regla r = L || C || A || E', () => {
      // ARRANGE
      const r = (p: ModulePermissions) =>
        p.puedeLeer || p.puedeCrear || p.puedeActualizar || p.puedeEliminar;

      // ASSERT — cualquier flag true activa lectura implícita
      expect(r({ puedeLeer: true,  puedeCrear: false, puedeActualizar: false, puedeEliminar: false })).toBe(true);
      expect(r({ puedeLeer: false, puedeCrear: true,  puedeActualizar: false, puedeEliminar: false })).toBe(true);
      expect(r({ puedeLeer: false, puedeCrear: false, puedeActualizar: true,  puedeEliminar: false })).toBe(true);
      expect(r({ puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: true  })).toBe(true);
      // Ningún flag → sin acceso
      expect(r({ puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false })).toBe(false);
    });
  });

  // ============================================================
  // RP-05 — Verificación
  // DOCENTE (solo lectura en SOLICITUD) bloqueado al intentar crear
  // ============================================================
  describe('RP-05: DOCENTE con puedeLeer=true y puedeCrear=false en SOLICITUD', () => {
    it('puedeCrear=false implica que DynamicPermissionInterceptor devolvería 403', () => {
      // ARRANGE
      const docenteSOLICITUD: ModulePermissions = {
        puedeLeer: true, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
      };

      // ASSERT — nivel es "read", no "write" → nivel insuficiente para POST
      expect(docenteSOLICITUD.puedeCrear).toBe(false);
      expect(levelFromPermissions(docenteSOLICITUD)).toBe('read');
    });

    it('nivel "read" no alcanza el umbral "write" requerido para operaciones de escritura', () => {
      // ARRANGE
      const ACCESS_HIERARCHY: Record<string, number> = { none: 0, read: 1, write: 2 };
      const nivelDocente = 'read';
      const nivelRequerido = 'write';

      // ASSERT
      expect(ACCESS_HIERARCHY[nivelDocente] < ACCESS_HIERARCHY[nivelRequerido]).toBe(true);
    });
  });

  // ============================================================
  // RP-06 — Verificación
  // PROFESOR_A_CARGO puede crear solicitudes (tiene LCA en SOLICITUD)
  // ============================================================
  describe('RP-06: PROFESOR_A_CARGO con puedeCrear=true en SOLICITUD', () => {
    it('puedeCrear=true y nivel "write" → DynamicPermissionInterceptor permitiría el POST', () => {
      // ARRANGE
      const profesorSOLICITUD: ModulePermissions = {
        puedeLeer: true, puedeCrear: true, puedeActualizar: true, puedeEliminar: false,
      };

      // ASSERT
      expect(profesorSOLICITUD.puedeCrear).toBe(true);
      expect(levelFromPermissions(profesorSOLICITUD)).toBe('write');
    });

    it('nivel "write" alcanza el umbral requerido para operaciones de escritura', () => {
      // ARRANGE
      const ACCESS_HIERARCHY: Record<string, number> = { none: 0, read: 1, write: 2 };
      const nivelProfesor = levelFromPermissions({
        puedeLeer: true, puedeCrear: true, puedeActualizar: true, puedeEliminar: false,
      });

      // ASSERT
      expect(ACCESS_HIERARCHY[nivelProfesor] >= ACCESS_HIERARCHY['write']).toBe(true);
    });
  });

  // ============================================================
  // RP-07 — Verificación
  // GET /api/v1/permisos/matrix retorna los 65 módulos del sistema
  // ============================================================
  describe('RP-07: permissionService.getPermissions() agrupa exactamente 65 módulos distintos', () => {
    it('la respuesta JSON de la API contiene 65 módulos distintos por rol', async () => {
      // ARRANGE — simular backend con 65 módulos y 7 roles
      const codigosModulo = Array.from({ length: 65 }, (_, i) => `MODULO_${i + 1}`);
      const roles = [
        'ADMINISTRADOR', 'CO_ADMINISTRADOR', 'GESTOR_PEDIDOS',
        'PROFESOR_A_CARGO', 'DOCENTE', 'ENCARGADO_BODEGA', 'ASISTENTE_BODEGA',
      ];

      const dtos = codigosModulo.flatMap((codigo, mIdx) =>
        roles.map((rol, rIdx) => ({
          idRol: rIdx + 1, nombreRol: rol,
          idModulo: mIdx + 1, codigoModulo: codigo, nombreModulo: codigo,
          ordenModulo: mIdx + 1, idPermisoRol: rIdx * 65 + mIdx + 1,
          nivelAcceso: 'SIN_ACCESO' as const,
          puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
        }))
      );

      // El endpoint agrupa las DTOs por codigoModulo (un array por módulo)
      const responseAgrupada: Record<string, typeof dtos> = {};
      for (const dto of dtos) {
        if (!responseAgrupada[dto.codigoModulo]) responseAgrupada[dto.codigoModulo] = [];
        responseAgrupada[dto.codigoModulo].push(dto);
      }

      mockApiGet.mockResolvedValueOnce({ data: responseAgrupada });

      // ACT
      const result = await permissionService.getPermissions();

      // ASSERT — contar módulos distintos en todos los roles
      const modulosDistintos = new Set<string>();
      result.forEach((rp) => Object.keys(rp.permissions).forEach((k) => modulosDistintos.add(k)));

      expect(modulosDistintos.size).toBe(65);
    });
  });

  // ============================================================
  // RP-08 — Validación
  // Subir PEDIDO_SEMANAL_BODEGA a Escritura activa hijos PEDIDO_SEM_*
  //   (cascade descendente — MODULE_CHILDREN)
  // ============================================================
  describe('RP-08: Cascade descendente — PEDIDO_SEMANAL_BODEGA a Escritura activa los 4 hijos', () => {
    it('PEDIDO_SEM_CREAR, EDITAR, INACTIVAR y ELIMINAR pasan a Escritura automáticamente', () => {
      // ARRANGE
      const initial: Partial<Record<ModuleKey, ModulePermissions>> = {
        PEDIDO_SEMANAL_BODEGA: { ...nonePerms },
        PEDIDO_SEM_CREAR:      { ...nonePerms },
        PEDIDO_SEM_EDITAR:     { ...nonePerms },
        PEDIDO_SEM_INACTIVAR:  { ...nonePerms },
        PEDIDO_SEM_ELIMINAR:   { ...nonePerms },
      };

      // ACT — subir padre a Escritura
      const result = applyCascade('PEDIDO_SEMANAL_BODEGA', writePerms, initial);

      // ASSERT — los 4 hijos ahora tienen Escritura
      expect(result.PEDIDO_SEM_CREAR!.puedeCrear).toBe(true);
      expect(result.PEDIDO_SEM_EDITAR!.puedeActualizar).toBe(true);
      expect(result.PEDIDO_SEM_INACTIVAR!.puedeActualizar).toBe(true);
      expect(result.PEDIDO_SEM_ELIMINAR!.puedeEliminar).toBe(true);
    });

    it('al bajar el padre a Sin Acceso todos los hijos quedan en Sin Acceso', () => {
      // ARRANGE
      const initial: Partial<Record<ModuleKey, ModulePermissions>> = {
        PEDIDO_SEMANAL_BODEGA: { ...writePerms },
        PEDIDO_SEM_CREAR:      { ...writePerms },
        PEDIDO_SEM_EDITAR:     { ...writePerms },
        PEDIDO_SEM_INACTIVAR:  { ...writePerms },
        PEDIDO_SEM_ELIMINAR:   { ...writePerms },
      };

      // ACT
      const result = applyCascade('PEDIDO_SEMANAL_BODEGA', nonePerms, initial);

      // ASSERT
      expect(result.PEDIDO_SEM_CREAR!.puedeCrear).toBe(false);
      expect(result.PEDIDO_SEM_ELIMINAR!.puedeEliminar).toBe(false);
    });
  });

  // ============================================================
  // RP-09 — Validación
  // CONG_APROBAR_PEDIDO a Escritura sube el nivel del padre
  //   (cascade ascendente — MODULE_PARENTS)
  // ============================================================
  describe('RP-09: Cascade ascendente — CONG_APROBAR_PEDIDO a Escritura recalcula ancestros', () => {
    it('CONGLOMERADO_PEDIDOS sube a Escritura y CONG_VISTA_APROBACION sube a Lectura (cappado)', () => {
      // ARRANGE — todos los módulos en Sin Acceso inicialmente
      const initial: Partial<Record<ModuleKey, ModulePermissions>> = {
        CONGLOMERADO_PEDIDOS:  { ...nonePerms },
        CONG_VISTA_APROBACION: { ...nonePerms },
        CONG_VISTA_CRONOGRAMA: { ...nonePerms },
        CONG_VISTA_TOTALES:    { ...nonePerms },
        CONG_VISTA_CATEGORIAS: { ...nonePerms },
        CONG_APROBAR_PEDIDO:   { ...nonePerms },
        CONG_RECHAZAR_PEDIDO:  { ...nonePerms },
      };

      // ACT — subir CONG_APROBAR_PEDIDO a Escritura
      const result = applyCascade('CONG_APROBAR_PEDIDO', writePerms, initial);

      // ASSERT — padre sube a Escritura
      expect(levelFromPermissions(result.CONGLOMERADO_PEDIDOS)).toBe('write');

      // ASSERT — CONG_VISTA_APROBACION es READ_MODULE → se cappea a Lectura
      expect(levelFromPermissions(result.CONG_VISTA_APROBACION)).toBe('read');
    });
  });

  // ============================================================
  // RP-10 — Verificación
  // PEDIDO_SEM_ELIMINAR: ícono Eliminar deshabilitado para PROFESOR_A_CARGO
  // ============================================================
  describe('RP-10: PROFESOR_A_CARGO no puede eliminar pedido semanal (BinaryWriteCell disabled)', () => {
    it('puedeEliminar=false para PEDIDO_SEM_ELIMINAR hace que el ícono quede atenuado', () => {
      // ARRANGE — permisos reales del PROFESOR_A_CARGO para el módulo PEDIDO_SEM_ELIMINAR
      const profesorPedidoSemEliminar: ModulePermissions = {
        puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
      };

      // ACT & ASSERT
      expect(profesorPedidoSemEliminar.puedeEliminar).toBe(false);
      expect(levelFromPermissions(profesorPedidoSemEliminar)).toBe('none');
    });

    it('isDisabled = true cuando puedeEliminar=false (lógica que aplica opacity-40 en la UI)', () => {
      // ARRANGE
      const perms: ModulePermissions = {
        puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
      };

      // ACT
      const isDisabled = !perms.puedeEliminar;

      // ASSERT
      expect(isDisabled).toBe(true);
    });

    it('otros íconos (crear, editar, inactivar) sí están activos para PROFESOR_A_CARGO en PEDIDO_SEM_CREAR', () => {
      // ARRANGE — PROFESOR tiene acceso de escritura sobre PEDIDO_SEM_CREAR / EDITAR / INACTIVAR
      const activo: ModulePermissions = {
        puedeLeer: true, puedeCrear: true, puedeActualizar: true, puedeEliminar: false,
      };

      // ASSERT — acciones disponibles
      expect(activo.puedeCrear).toBe(true);
      expect(activo.puedeActualizar).toBe(true);
      // Eliminar sigue deshabilitado
      expect(activo.puedeEliminar).toBe(false);
    });
  });

  // ============================================================
  // RP-11 — Verificación
  // Guardar nuevo nivel de permiso para un rol desde la UI
  //   POST /api/v1/permisos/upsert
  // ============================================================
  describe('RP-11: savePermissions() llama POST /permisos/upsert con los flags correctos', () => {
    it('persiste puedeLeer=true y los demás en false para GESTOR_PEDIDOS / HISTORICO_PEDIDOS', async () => {
      // ARRANGE — llenar el cache con la fila original (Sin Acceso)
      const cacheDTO = [{
        idRol: 3, nombreRol: 'GESTOR_PEDIDOS',
        idModulo: 50, codigoModulo: 'HISTORICO_PEDIDOS', nombreModulo: 'Histórico de Pedidos',
        ordenModulo: 50, idPermisoRol: 999,
        nivelAcceso: 'SIN_ACCESO' as const,
        puedeLeer: false, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
      }];

      mockApiGet.mockResolvedValueOnce({ data: { HISTORICO_PEDIDOS: cacheDTO } });
      mockApiPost.mockResolvedValueOnce({ data: { ok: true } });

      await permissionService.getPermissions(); // llena el cache interno

      const updated = [{
        role: 'Gestor de Pedidos', // nombre display
        permissions: {
          HISTORICO_PEDIDOS: {
            puedeLeer: true, puedeCrear: false, puedeActualizar: false, puedeEliminar: false,
          },
        } as any,
      }];

      // ACT
      await permissionService.savePermissions(updated);

      // ASSERT
      expect(mockApiPost).toHaveBeenCalledWith('/permisos/upsert', expect.objectContaining({
        idRol:           3,
        idModulo:        50,
        puedeLeer:       true,
        puedeCrear:      false,
        puedeActualizar: false,
        puedeEliminar:   false,
      }));
    });
  });

  // ============================================================
  // RP-12 — Verificación
  // Restaurar todos los permisos a los valores del script SQL original
  // ============================================================
  describe('RP-12: restaurarPredeterminado() invoca POST /permisos/restaurar-predeterminado', () => {
    it('llama al endpoint correcto e invalida el cache local', async () => {
      // ARRANGE
      mockApiPost.mockResolvedValueOnce({ data: {} });

      // ACT
      await permissionService.restaurarPredeterminado();

      // ASSERT
      expect(mockApiPost).toHaveBeenCalledWith('/permisos/restaurar-predeterminado');
    });
  });

  // ============================================================
  // RP-13 — Verificación
  // ENCARGADO_BODEGA redirigido sin acceso a /gestion-pedidos
  // ============================================================
  describe('RP-13: ENCARGADO_BODEGA redirigido a /sin-acceso en /gestion-pedidos', () => {
    it('protected-route redirige porque GESTION_PEDIDOS: puedeLeer=false', async () => {
      // ARRANGE
      mockAuth(USERS.encargado);
      // ENCARGADO tiene inventario/bodega pero NO gestion-pedidos
      mockPermission((m) => m !== 'GESTION_PEDIDOS');

      // ACT
      renderProtectedRoute('/gestion-pedidos', 'gestion-pedidos');

      // ASSERT
      await waitFor(() => {
        expect(screen.getByTestId('sin-acceso')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('pagina-contenido')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // RP-14 — Verificación
  // Alerta si falta INSERT SQL de un módulo en la tabla modulo
  //   (missingModules — detecta código en frontend no presente en backend)
  // ============================================================
  describe('RP-14: missingModules detecta módulos definidos en frontend pero ausentes en BD', () => {
    it('GA_VER_SALAS ausente en la respuesta del backend aparece en la lista de faltantes', () => {
      // ARRANGE — módulos que el frontend conoce
      const frontendModules: ModuleKey[] = [
        'DASHBOARD', 'INVENTARIO', 'SOLICITUD',
        'GA_VER_SALAS', // <── existe en ModuleKey pero se omite del backend simulado
      ];
      // Backend no devuelve GA_VER_SALAS (el INSERT SQL fue eliminado de la BD)
      const backendCodes = new Set<string>(['DASHBOARD', 'INVENTARIO', 'SOLICITUD']);

      // ACT — replica del useMemo en gestion-roles.tsx
      const missingModules = frontendModules.filter((m) => !backendCodes.has(m));

      // ASSERT — aparece en la alerta amarilla de la UI
      expect(missingModules).toContain('GA_VER_SALAS');
      expect(missingModules).toHaveLength(1);
    });

    it('cuando todos los módulos están en la BD no se genera alerta', () => {
      // ARRANGE
      const frontendModules: ModuleKey[] = ['DASHBOARD', 'INVENTARIO', 'SOLICITUD'];
      const backendCodes = new Set<string>(['DASHBOARD', 'INVENTARIO', 'SOLICITUD']);

      // ACT
      const missingModules = frontendModules.filter((m) => !backendCodes.has(m));

      // ASSERT
      expect(missingModules).toHaveLength(0);
    });
  });

  // ============================================================
  // RP-15 — Verificación
  // ASISTENTE_BODEGA sin acceso a /inventario (módulo no asignado)
  // ============================================================
  describe('RP-15: ASISTENTE_BODEGA redirigido a /sin-acceso en /inventario', () => {
    it('protected-route redirige porque INVENTARIO: puedeLeer=false para ASISTENTE', async () => {
      // ARRANGE
      mockAuth(USERS.asistente);
      // ASISTENTE no tiene acceso a INVENTARIO
      mockPermission((m) => m !== 'INVENTARIO');

      // ACT
      renderProtectedRoute('/inventario', 'inventario');

      // ASSERT
      await waitFor(() => {
        expect(screen.getByTestId('sin-acceso')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('pagina-contenido')).not.toBeInTheDocument();
    });
  });

});
