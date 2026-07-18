import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, CardHeader, Button, Input, Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Chip, Avatar, Tooltip, Divider, Selection,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Tabs, Tab
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion, RolUsuario } from '../types/usuario/usuario.types';
import {
  crearUsuarioService,
  actualizarUsuarioService,
  eliminarUsuarioService,
  subirFotoPerfilService,
  obtenerUsuariosPaginadosService,
  buscarUsuariosService,
  obtenerEstadoUsuariosService,
  rolesNombresAIds,
  obtenerNombreRolPorId
} from '../services/usuario/usuario-service';
import { useAuth } from '../contexts/auth-context';
import { useModulePermission, usePermission } from '../contexts/permission-context';
import { useToast, useConfirm } from '../hooks/useToast';
import { usePageTitle } from '../hooks/usePageTitle';
import { TableSkeleton, TableSkeletonColumn } from '../components/SkeletonLoader';
import { logger } from '../utils/logger';
import { permissionService } from '../services/usuario/permission-service';
import {
  ACCESS_HIERARCHY,
  AccessLevel,
  ModuleKey,
  ModulePermissions,
  MODULE_LABELS,
  MODULE_ICONS,
  RolePermission,
  emptyModulePermissions,
  levelFromPermissions,
} from '../types/usuario/permissions.types';

const ROLES: RolUsuario[] = [
  'Administrador',
  'Co-Administrador',
  'Gestor de Pedidos',
  'Profesor',
  'Profesor a Cargo',
  'Encargado de Bodega',
  'Asistente de Bodega'
];

// ═══════════════════════════════════════════════════════════════════════════
// TAB "ROLES Y PERMISOS" — fusionado desde gestion-roles.tsx
// Matriz interactiva: Módulos (filas) × Roles (columnas). Solo visible/accesible
// para el Administrador (isAdmin hardcoded, igual que la página original).
// ═══════════════════════════════════════════════════════════════════════════

// ── Opciones de nivel de acceso ───────────────────────────────────────────────

const ACCESS_OPTIONS: { value: AccessLevel; label: string; chipColor: 'default' | 'warning' | 'success'; icon: string }[] = [
  { value: 'none',  label: 'Sin Acceso',    chipColor: 'default', icon: 'lucide:lock' },
  { value: 'read',  label: 'Solo Lectura',  chipColor: 'warning', icon: 'lucide:eye' },
  { value: 'write', label: 'Escritura',     chipColor: 'success', icon: 'lucide:pencil' },
];

// ── Módulos agrupados por categoría (mismo orden del menú lateral) ───────────
// General → Centro de Operaciones → Inventario → Usuarios → Sistema.
// Cada submódulo/vista/acción interna va justo debajo de su página padre.
const MODULE_GROUPS: { title: string; modules: ModuleKey[] }[] = [
  { title: 'General', modules: ['DASHBOARD'] },
  {
    title: 'Centro de Operaciones',
    modules: [
      'PEDIDO_SEMANAL_BODEGA',
      'PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR', 'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR',
      'SOLICITUD',
      'GESTION_SOLICITUDES', 'GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR',
      'GESTION_PEDIDOS', 'GP_VISTA_RESUMEN', 'GP_VISTA_ACEPTADAS',
      'CONGLOMERADO_PEDIDOS', 'CONG_VISTA_APROBACION', 'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO', 'CONG_VISTA_CRONOGRAMA', 'CONG_VISTA_TOTALES', 'CONG_VISTA_CATEGORIAS',
      'GESTION_PROVEEDORES',
        'GPRV_DATOS_PROV', 'GPRV_EXPORT_DATOS',
        'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
        'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
        'GPRV_ORDENES', 'GPRV_PENDIENTE_ENVIADA', 'GPRV_CONFIRMADA', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP',
      'GESTION_ACADEMICA',
        'GA_VER_ASIGNATURA',
        'GA_CREAR_ASIGNATURA', 'GA_CREAR_SECCION',
        'GA_EDITAR_ASIGNATURA', 'GA_ELIMINAR_ASIGNATURA',
        'GA_EDITAR_SECCION', 'GA_ELIMINAR_SECCION',
        'GA_VER_RESERVAS', 'GA_VER_SALAS',
        'GA_CREAR_SALA', 'GA_EDITAR_SALA', 'GA_ELIMINAR_SALA',
      'HISTORICO_PEDIDOS', 'HIST_EXPORT_EXCEL',
    ],
  },
  {
    title: 'Inventario',
    modules: [
      'INVENTARIO',
        'INV_NUEVO_PRODUCTO', 'INV_EDITAR_PRODUCTO',
        'INV_CONTROL_MASIVO', 'INV_ABAST_BODEGA', 'INV_ABAST_PROV',
        'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO',
        'INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL',
        'GESTION_CATEGORIAS', 'GESTION_UNIDADES',
      'HISTORIAL_MOVIMIENTOS',
      'BODEGA_TRANSITO',
        'BOD_NUEVO', 'BOD_CONTROL_MASIVO', 'BOD_ABASTECIMIENTO',
        'BOD_EDITAR_PRODUCTO',
        'INV_ABASTECIMIENTO',
        'INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL',
        'GESTION_CATEGORIAS', 'GESTION_UNIDADES',
        'GESTION_PEDIDOS_DIARIOS',
        'GPD_RESUMEN_PERIODO', 'GPD_PREPARAR_ENTREGA',
    ],
  },
  { title: 'Usuarios', modules: ['GESTION_USUARIOS'] },
  {
    title: 'Sistema',
    modules: ['ADMIN_SISTEMA', 'ADMIN_BLOQUES_HORARIOS', 'ADMIN_SEMANAS', 'ADMIN_CONFIG_SISTEMA'],
  },
];

// Submódulos (vistas/acciones internas) → se muestran indentados bajo su padre.
const SUBMODULES = new Set<ModuleKey>([
  'PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR', 'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR',
  'GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR',
  'GP_VISTA_RESUMEN', 'GP_VISTA_ACEPTADAS',
  'CONG_VISTA_APROBACION', 'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO',
  'CONG_VISTA_CRONOGRAMA', 'CONG_VISTA_TOTALES', 'CONG_VISTA_CATEGORIAS',
  'GESTION_CATEGORIAS', 'GESTION_UNIDADES',
  'GESTION_PEDIDOS_DIARIOS',
  'ADMIN_BLOQUES_HORARIOS', 'ADMIN_SEMANAS', 'ADMIN_CONFIG_SISTEMA',
  'GPRV_DATOS_PROV', 'GPRV_EXPORT_DATOS',
  'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
  'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
  'GPRV_ORDENES', 'GPRV_PENDIENTE_ENVIADA', 'GPRV_CONFIRMADA', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP',
  'GA_VER_ASIGNATURA',
  'GA_CREAR_ASIGNATURA', 'GA_CREAR_SECCION',
  'GA_EDITAR_ASIGNATURA', 'GA_ELIMINAR_ASIGNATURA',
  'GA_EDITAR_SECCION', 'GA_ELIMINAR_SECCION',
  'GA_VER_RESERVAS', 'GA_VER_SALAS',
  'GA_CREAR_SALA', 'GA_EDITAR_SALA', 'GA_ELIMINAR_SALA',
  'INV_NUEVO_PRODUCTO', 'INV_EDITAR_PRODUCTO',
  'INV_CONTROL_MASIVO',
  'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO',
  'INV_STOCK_DISPONIBLE',
  'BOD_NUEVO', 'BOD_CONTROL_MASIVO', 'BOD_EDITAR_PRODUCTO',
  'HIST_EXPORT_EXCEL',
]);

// Sub-sub-módulos (hijos de SUBMODULES) → sangría extra para mostrar que son nivel 3.
const SUB_SUBMODULES = new Set<ModuleKey>([
  'INV_ABAST_BODEGA', 'INV_ABAST_PROV',
  'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL',
  'BOD_ABASTECIMIENTO',
  'GPD_RESUMEN_PERIODO', 'GPD_PREPARAR_ENTREGA',
]);

const ALL_MODULES: ModuleKey[] = MODULE_GROUPS.flatMap((g) => g.modules);

// ── Módulos "aglobados" → acciones hijas ─────────────────────────────────────
// Al cambiar el módulo padre se copia su perfil CRUD a las acciones hijas
// (Escritura las habilita todas; el admin luego puede desactivar las que quiera).
const MODULE_CHILDREN: Partial<Record<ModuleKey, ModuleKey[]>> = {
  PEDIDO_SEMANAL_BODEGA: ['PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR', 'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR'],
  GESTION_SOLICITUDES:   ['GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR'],
  GESTION_PEDIDOS:       ['GP_VISTA_RESUMEN', 'GP_VISTA_ACEPTADAS'],
  CONGLOMERADO_PEDIDOS:  ['CONG_VISTA_APROBACION', 'CONG_VISTA_CRONOGRAMA', 'CONG_VISTA_TOTALES', 'CONG_VISTA_CATEGORIAS', 'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO'],
  CONG_VISTA_APROBACION: ['CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO'],
  GESTION_PROVEEDORES:   ['GPRV_DATOS_PROV', 'GPRV_EXPORT_DATOS', 'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION', 'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV', 'GPRV_ORDENES', 'GPRV_PENDIENTE_ENVIADA', 'GPRV_CONFIRMADA', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP'],
  GESTION_ACADEMICA:     ['GA_VER_ASIGNATURA', 'GA_CREAR_ASIGNATURA', 'GA_CREAR_SECCION', 'GA_EDITAR_ASIGNATURA', 'GA_ELIMINAR_ASIGNATURA', 'GA_EDITAR_SECCION', 'GA_ELIMINAR_SECCION'],
  ADMIN_SISTEMA:         ['ADMIN_BLOQUES_HORARIOS', 'ADMIN_SEMANAS', 'ADMIN_CONFIG_SISTEMA'],
  INVENTARIO:            ['INV_NUEVO_PRODUCTO', 'INV_EDITAR_PRODUCTO', 'INV_CONTROL_MASIVO', 'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO', 'INV_STOCK_DISPONIBLE', 'GESTION_CATEGORIAS', 'GESTION_UNIDADES'],
  INV_CONTROL_MASIVO:   ['INV_ABAST_BODEGA', 'INV_ABAST_PROV'],
  INV_STOCK_DISPONIBLE: ['SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL'],
  BODEGA_TRANSITO:          ['BOD_NUEVO', 'BOD_CONTROL_MASIVO', 'BOD_EDITAR_PRODUCTO', 'INV_ABASTECIMIENTO', 'INV_STOCK_DISPONIBLE', 'GESTION_CATEGORIAS', 'GESTION_UNIDADES'],
  GESTION_PEDIDOS_DIARIOS:  ['GPD_RESUMEN_PERIODO', 'GPD_PREPARAR_ENTREGA'],
  BOD_CONTROL_MASIVO:    ['BOD_ABASTECIMIENTO'],
  HISTORICO_PEDIDOS:     ['HIST_EXPORT_EXCEL'],
};

// Inverso de MODULE_CHILDREN: hijo → lista de padres directos.
// Permite que al asignar permiso a un hijo se promueva al padre a al menos Lectura.
const MODULE_PARENTS: Partial<Record<ModuleKey, ModuleKey[]>> = (() => {
  const map: Partial<Record<ModuleKey, ModuleKey[]>> = {};
  for (const [parent, children] of Object.entries(MODULE_CHILDREN) as [ModuleKey, ModuleKey[]][]) {
    for (const child of children) {
      if (!map[child]) map[child] = [];
      map[child]!.push(parent as ModuleKey);
    }
  }
  return map;
})();

// ── Separadores visuales de sección dentro de un módulo padre ────────────────
// Antes de renderizar el módulo indicado se muestra una fila etiqueta de sección.
const SECTION_HEADERS: Partial<Record<ModuleKey, string>> = {
  GPRV_DATOS_PROV:         'Pestaña: Proveedores',
  GPRV_ORDENES:            'Pestaña: Órdenes de Pedido',
  GA_VER_ASIGNATURA:       'Pestaña: Gestión Académica',
  GA_VER_RESERVAS:         'Pestaña: Gestión Sala y Reservas',
  BODEGA_TRANSITO:         'Pestaña: Bodega de Tránsito',
  GESTION_PEDIDOS_DIARIOS: 'Pestaña: Gestión de Pedidos Diarios',
};

// ── Etiquetas alternativas para módulos compartidos en contexto Bodega de Tránsito ──
// Aplican solo a los módulos que aparecen DESPUÉS de BODEGA_TRANSITO en el grupo Inventario.
const BODEGA_LABEL_OVERRIDES: Partial<Record<ModuleKey, string>> = {
  INV_ABASTECIMIENTO:   'Bodega · Gestión Abastecimiento',
  INV_STOCK_DISPONIBLE: 'Bodega · Stock Disponible',
};

// ── Acciones CRUD seleccionables por celda ───────────────────────────────────
const CRUD_ACTIONS: { key: keyof ModulePermissions; label: string; icon: string }[] = [
  { key: 'puedeLeer',       label: 'Leer',     icon: 'lucide:eye' },
  { key: 'puedeCrear',      label: 'Crear',    icon: 'lucide:plus' },
  { key: 'puedeActualizar', label: 'Editar',   icon: 'lucide:pencil' },
  { key: 'puedeEliminar',   label: 'Eliminar', icon: 'lucide:trash-2' },
];

// Módulos donde puedeEliminar no aplica y no debe mostrarse en la celda CRUD.
const NO_DELETE_MODULES = new Set<ModuleKey>(['GESTION_USUARIOS']);
const CRUD_ACTIONS_NO_DELETE = CRUD_ACTIONS.filter((a) => a.key !== 'puedeEliminar');

// ── Componente chip de nivel de acceso ────────────────────────────────────────

const AccessChip: React.FC<{ level: AccessLevel }> = ({ level }) => {
  const opt = ACCESS_OPTIONS.find((o) => o.value === level) ?? ACCESS_OPTIONS[0];
  return (
    <Chip
      size="sm"
      color={opt.chipColor}
      variant="flat"
      startContent={<Icon icon={opt.icon} width={12} />}
    >
      {opt.label}
    </Chip>
  );
};

// ── Helpers de estilo de celda (compartidos por los 3 tipos de control) ───────
const TRIGGER_BASE =
  'inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium ' +
  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/40';

const levelBg = (level: AccessLevel): string =>
  level === 'write' ? 'bg-success-50 border-success-200 text-success-700 dark:bg-success-50/10 dark:text-success-400' :
  level === 'read'  ? 'bg-warning-50 border-warning-200 text-warning-700 dark:bg-warning-50/10 dark:text-warning-400' :
                      'bg-default-100 border-default-200 text-default-500 dark:bg-default-50/10';

interface CrudCellProps {
  perms:    ModulePermissions;
  disabled: boolean;
  onChange: (p: ModulePermissions) => void;
}

// Genera el perfil CRUD a partir de un nivel resumido (para celdas no granulares).
const permsFromLevel = (level: AccessLevel): ModulePermissions =>
  level === 'write' ? { puedeLeer: true, puedeCrear: true, puedeActualizar: true, puedeEliminar: true } :
  level === 'read'  ? { puedeLeer: true, puedeCrear: false, puedeActualizar: false, puedeEliminar: false } :
                      emptyModulePermissions();

// ── Celda CRUD granular (módulos normales) ────────────────────────────────────
// Muestra un resumen (Sin Acceso / Lectura / Escritura + qué acciones) y al abrir
// permite marcar individualmente Leer / Crear / Editar / Eliminar.
// Regla: cualquier acción de escritura implica Leer automáticamente.

const CrudCell: React.FC<CrudCellProps> = ({ perms, disabled, onChange }) => {
  const level = levelFromPermissions(perms);

  const selectedKeys = new Set<string>();
  CRUD_ACTIONS.forEach((a) => { if (perms[a.key]) selectedKeys.add(a.key); });
  if (level === 'write') selectedKeys.add('puedeLeer'); // escritura implica lectura

  const apply = (keys: Set<string>) => {
    const c = keys.has('puedeCrear');
    const u = keys.has('puedeActualizar');
    const d = keys.has('puedeEliminar');
    const r = keys.has('puedeLeer') || c || u || d;
    onChange({ puedeLeer: r, puedeCrear: c, puedeActualizar: u, puedeEliminar: d });
  };

  const levelLabel = level === 'write' ? 'Escritura' : level === 'read' ? 'Lectura' : 'Sin Acceso';
  const levelIcon  = level === 'write' ? 'lucide:pencil' : level === 'read' ? 'lucide:eye' : 'lucide:lock';

  return (
    <Dropdown placement="bottom" isDisabled={disabled}>
      <DropdownTrigger>
        <button
          type="button"
          disabled={disabled}
          className={`${TRIGGER_BASE} ${levelBg(level)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
        >
          <Icon icon={levelIcon} width={12} />
          <span>{levelLabel}</span>
          {level === 'write' && (
            <span className="flex items-center gap-0.5 ml-0.5 opacity-80">
              {perms.puedeCrear      && <Icon icon="lucide:plus" width={11} />}
              {perms.puedeActualizar && <Icon icon="lucide:pencil" width={11} />}
              {perms.puedeEliminar   && <Icon icon="lucide:trash-2" width={11} />}
            </span>
          )}
          <Icon icon="lucide:chevron-down" width={11} className="ml-0.5 opacity-60" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Seleccionar permisos"
        closeOnSelect={false}
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          const set = typeof keys === 'string' ? new Set<string>() : new Set(Array.from(keys).map(String));
          apply(set);
        }}
      >
        {CRUD_ACTIONS.map((a) => (
          <DropdownItem key={a.key} startContent={<Icon icon={a.icon} width={14} />}>
            {a.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

// ── Celda CRUD sin opción Eliminar (para módulos donde no aplica) ─────────────
const CrudCellNoDelete: React.FC<CrudCellProps> = ({ perms, disabled, onChange }) => {
  const sanitized = { ...perms, puedeEliminar: false };
  const level = levelFromPermissions(sanitized);

  const selectedKeys = new Set<string>();
  CRUD_ACTIONS_NO_DELETE.forEach((a) => { if (sanitized[a.key]) selectedKeys.add(a.key); });
  if (level === 'write') selectedKeys.add('puedeLeer');

  const apply = (keys: Set<string>) => {
    const c = keys.has('puedeCrear');
    const u = keys.has('puedeActualizar');
    const r = keys.has('puedeLeer') || c || u;
    onChange({ puedeLeer: r, puedeCrear: c, puedeActualizar: u, puedeEliminar: false });
  };

  const levelLabel = level === 'write' ? 'Escritura' : level === 'read' ? 'Lectura' : 'Sin Acceso';
  const levelIcon  = level === 'write' ? 'lucide:pencil' : level === 'read' ? 'lucide:eye' : 'lucide:lock';

  return (
    <Dropdown placement="bottom" isDisabled={disabled}>
      <DropdownTrigger>
        <button
          type="button"
          disabled={disabled}
          className={`${TRIGGER_BASE} ${levelBg(level)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
        >
          <Icon icon={levelIcon} width={12} />
          <span>{levelLabel}</span>
          {level === 'write' && (
            <span className="flex items-center gap-0.5 ml-0.5 opacity-80">
              {sanitized.puedeCrear      && <Icon icon="lucide:plus" width={11} />}
              {sanitized.puedeActualizar && <Icon icon="lucide:pencil" width={11} />}
            </span>
          )}
          <Icon icon="lucide:chevron-down" width={11} className="ml-0.5 opacity-60" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Seleccionar permisos"
        closeOnSelect={false}
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          const set = typeof keys === 'string' ? new Set<string>() : new Set(Array.from(keys).map(String));
          apply(set);
        }}
      >
        {CRUD_ACTIONS_NO_DELETE.map((a) => (
          <DropdownItem key={a.key} startContent={<Icon icon={a.icon} width={14} />}>
            {a.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

// ── Celda de 3 estados (módulo "aglobado": página con cascada) ────────────────
// Sin Acceso / Lectura / Escritura. La Lectura deja la página solo-lectura
// (ver filtros/detalle, íconos apagados); la Escritura cascadea a sus acciones.
const TRISTATE_OPTIONS: { key: AccessLevel; label: string; icon: string }[] = [
  { key: 'none',  label: 'Sin Acceso', icon: 'lucide:lock' },
  { key: 'read',  label: 'Lectura',    icon: 'lucide:eye' },
  { key: 'write', label: 'Escritura',  icon: 'lucide:pencil' },
];

const TriStateCell: React.FC<CrudCellProps> = ({ perms, disabled, onChange }) => {
  const level = levelFromPermissions(perms);
  const opt = TRISTATE_OPTIONS.find((o) => o.key === level) ?? TRISTATE_OPTIONS[0];

  return (
    <Dropdown placement="bottom" isDisabled={disabled}>
      <DropdownTrigger>
        <button
          type="button"
          disabled={disabled}
          className={`${TRIGGER_BASE} ${levelBg(level)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
        >
          <Icon icon={opt.icon} width={12} />
          <span>{opt.label}</span>
          <Icon icon="lucide:chevron-down" width={11} className="ml-0.5 opacity-60" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Nivel de acceso"
        selectionMode="single"
        selectedKeys={new Set([level])}
        onSelectionChange={(keys) => {
          const k = (typeof keys === 'string' ? '' : Array.from(keys).map(String)[0]) as AccessLevel;
          if (k) onChange(permsFromLevel(k));
        }}
      >
        {TRISTATE_OPTIONS.map((o) => (
          <DropdownItem key={o.key} startContent={<Icon icon={o.icon} width={14} />}>
            {o.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

// ── Celda binaria de lectura (vista de solo consulta) ────────────────────────
// Para tabs que solo tienen Sin Acceso o Lectura: no existe acción de escritura
// propia; el write se gestiona con módulos de acción independientes.
const BinaryReadCell: React.FC<CrudCellProps> = ({ perms, disabled, onChange }) => {
  const isRead = perms.puedeLeer || perms.puedeCrear || perms.puedeActualizar || perms.puedeEliminar;
  const level: AccessLevel = isRead ? 'read' : 'none';

  return (
    <Dropdown placement="bottom" isDisabled={disabled}>
      <DropdownTrigger>
        <button
          type="button"
          disabled={disabled}
          className={`${TRIGGER_BASE} ${levelBg(level)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
        >
          <Icon icon={isRead ? 'lucide:eye' : 'lucide:lock'} width={12} />
          <span>{isRead ? 'Lectura' : 'Sin Acceso'}</span>
          <Icon icon="lucide:chevron-down" width={11} className="ml-0.5 opacity-60" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Permiso de lectura"
        selectionMode="single"
        selectedKeys={new Set([isRead ? 'read' : 'none'])}
        onSelectionChange={(keys) => {
          const k = typeof keys === 'string' ? '' : Array.from(keys).map(String)[0];
          onChange(k === 'read' ? permsFromLevel('read') : emptyModulePermissions());
        }}
      >
        <DropdownItem key="none" startContent={<Icon icon="lucide:lock" width={14} />}>Sin Acceso</DropdownItem>
        <DropdownItem key="read"  startContent={<Icon icon="lucide:eye"  width={14} />}>Lectura</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

// ── Celda binaria (acción: Sin permiso / Escritura) ───────────────────────────
// Para acciones puntuales (Nuevo, Editar, Inactivar, Eliminar): no tienen "Leer",
// solo se conceden o no. La página muestra el ícono apagado cuando es Sin permiso.
const BinaryWriteCell: React.FC<CrudCellProps> = ({ perms, disabled, onChange }) => {
  const isWrite = perms.puedeCrear || perms.puedeActualizar || perms.puedeEliminar;
  const level: AccessLevel = isWrite ? 'write' : 'none';

  return (
    <Dropdown placement="bottom" isDisabled={disabled}>
      <DropdownTrigger>
        <button
          type="button"
          disabled={disabled}
          className={`${TRIGGER_BASE} ${levelBg(level)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
        >
          <Icon icon={isWrite ? 'lucide:pencil' : 'lucide:lock'} width={12} />
          <span>{isWrite ? 'Escritura' : 'Sin permiso'}</span>
          <Icon icon="lucide:chevron-down" width={11} className="ml-0.5 opacity-60" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Permiso de acción"
        selectionMode="single"
        selectedKeys={new Set([isWrite ? 'write' : 'none'])}
        onSelectionChange={(keys) => {
          const k = typeof keys === 'string' ? '' : Array.from(keys).map(String)[0];
          onChange(k === 'write' ? permsFromLevel('write') : emptyModulePermissions());
        }}
      >
        <DropdownItem key="none" startContent={<Icon icon="lucide:lock" width={14} />}>Sin permiso</DropdownItem>
        <DropdownItem key="write" startContent={<Icon icon="lucide:pencil" width={14} />}>Escritura</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

// ── Clasificación de módulos por tipo de control ──────────────────────────────
// Aglobado (3 estados con cascada): la página Pedido Semanal a Bodega.
// Acción (binario Sin/Escritura): sus 4 acciones internas.
// Resto: CRUD granular (4 checkboxes).
// Vistas con solo dos opciones (Sin Acceso / Lectura): no tienen escritura propia.
// La escritura se gestiona con módulos de acción independientes (CONG_APROBAR_*, etc.).
const READ_MODULES = new Set<ModuleKey>([
  'CONG_VISTA_APROBACION', 'CONG_VISTA_CRONOGRAMA', 'CONG_VISTA_TOTALES',
  'GA_VER_ASIGNATURA',
  'GA_VER_RESERVAS', 'GA_VER_SALAS',
  'GPRV_DATOS_PROV',
  'GPRV_ORDENES',
  'HISTORICO_PEDIDOS',
  'INV_STOCK_DISPONIBLE', 'SD_INVENTARIO', 'SD_BODEGA_TRANSITO', 'SD_DISPONIBLE_REAL',
  'HISTORIAL_MOVIMIENTOS',
  'GPD_RESUMEN_PERIODO',
]);
const AGGREGATE_MODULES = new Set<ModuleKey>([
  'PEDIDO_SEMANAL_BODEGA', 'GESTION_SOLICITUDES', 'GESTION_PEDIDOS',
  'CONGLOMERADO_PEDIDOS', 'CONG_VISTA_CATEGORIAS',
  'GESTION_PROVEEDORES',
  'GESTION_ACADEMICA',
  'GESTION_PEDIDOS_DIARIOS',
  'ADMIN_BLOQUES_HORARIOS',
  'ADMIN_SEMANAS',
]);
const ACTION_MODULES = new Set<ModuleKey>([
  'PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR', 'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR',
  'GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR',
  'SOLICITUD',
  'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO',
  'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
  'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
  'GPRV_PENDIENTE_ENVIADA', 'GPRV_CONFIRMADA',
  'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP', 'GPRV_EXPORT_DATOS',
  'GA_CREAR_ASIGNATURA', 'GA_CREAR_SECCION',
  'GA_EDITAR_ASIGNATURA', 'GA_ELIMINAR_ASIGNATURA',
  'GA_EDITAR_SECCION', 'GA_ELIMINAR_SECCION',
  'GA_CREAR_SALA', 'GA_EDITAR_SALA', 'GA_ELIMINAR_SALA',
  'INV_NUEVO_PRODUCTO', 'INV_EDITAR_PRODUCTO', 'INV_ABAST_BODEGA', 'INV_ABAST_PROV',
  'INV_CONTROL_MASIVO', 'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO',
  'BOD_CONTROL_MASIVO', 'BOD_ABASTECIMIENTO', 'BOD_EDITAR_PRODUCTO',
  'HIST_EXPORT_EXCEL',
  'GPD_PREPARAR_ENTREGA',
  'ADMIN_CONFIG_SISTEMA',
]);
// ACTION_MODULES que requieren puedeActualizar en el padre para activarse (no basta puedeCrear).
const ACTION_REQUIRES_UPDATE = new Set<ModuleKey>(['BOD_EDITAR_PRODUCTO']);

const cellComponentFor = (moduleKey: ModuleKey): React.FC<CrudCellProps> =>
  ACTION_MODULES.has(moduleKey)    ? BinaryWriteCell :
  READ_MODULES.has(moduleKey)      ? BinaryReadCell :
  AGGREGATE_MODULES.has(moduleKey) ? TriStateCell :
  NO_DELETE_MODULES.has(moduleKey) ? CrudCellNoDelete :
                                     CrudCell;

// ── Skeleton: columnas espejo de la tabla de usuarios ──────────────────────
const USUARIOS_TABLE_COLS: TableSkeletonColumn[] = [
  { width: 'w-[25%]', shape: 'avatar-text' },
  { width: 'w-[15%]', shape: 'text' },
  { width: 'w-[20%]', shape: 'text' },
  { width: 'w-[15%]', shape: 'chip' },
  { width: 'w-[10%]', shape: 'chip' },
  { width: 'w-[15%]', shape: 'text' },
  { width: 'w-[100px]', shape: 'icons' },
];

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — Usuarios + Roles y Permisos, con pestañas
// ═══════════════════════════════════════════════════════════════════════════

const GestionUsuariosPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: usuarioActual } = useAuth();
  const { canCreate: usuPuedeCrear, canUpdate: usuPuedeEditar, canDelete: usuPuedeEliminar } = useModulePermission('GESTION_USUARIOS');
  const [usuarios, setUsuarios] = useState<IUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  // Filtro por rol (multi-select). rolesSeleccion = lo marcado en el dropdown (no consulta);
  // rolesAplicados = IDs ya confirmados que SÍ disparan la consulta (se setea al cerrar el selector).
  const [rolesSeleccion, setRolesSeleccion] = useState<Selection>(new Set([]));
  const [rolesAplicados, setRolesAplicados] = useState<number[]>([]);

  // Pagination states
  const [totalPages, setTotalPages] = useState<number>(1);
  const nextPageRef = React.useRef<number>(2);
  const lastLoadedPageRef = React.useRef<number>(1);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const isLoadingRef = React.useRef<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  // ── Tab activa (Usuarios / Roles y permisos) ──
  const location = useLocation();
  const { isAdmin, isLoading: permLoading, refreshPermissions } = usePermission();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'roles'>(
    location.pathname.startsWith('/gestion-roles') ? 'roles' : 'usuarios'
  );

  usePageTitle('Gestión de Usuarios', 'Administra los usuarios del sistema y, si eres Administrador, sus roles y permisos', 'lucide:user-cog');

  // Modal de crear/editar
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<IUsuario | null>(null);

  // Formulario
  const [formData, setFormData] = useState<IUsuarioCreacion>({
    primeroNombre: '',
    segundoNombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    username: '',
    email: '',
    password: '',
    confirmarPassword: '',
    rol: 'Profesor',
    fotoPerfil: undefined
  });
  const [selectedRolForm, setSelectedRolForm] = useState<Selection>(new Set(['Profesor']));
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialFormData, setInitialFormData] = useState<IUsuarioCreacion | null>(null);

  // Debounce de búsqueda
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filtro);
    }, 2500);
    return () => clearTimeout(timer);
  }, [filtro]);

  // Recargar la lista cuando cambia la búsqueda o el filtro de roles aplicado
  useEffect(() => {
    cargarUsuarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, rolesAplicados]);

  // Mantener isLoadingRef sincronizado
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Poll ligero cada 60 s: actualiza SOLO la columna de estado (activo/último acceso)
  // de los usuarios ya cargados, sin re-paginar ni reordenar la tabla.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isLoadingRef.current || isLoadingMoreRef.current) return;
      try {
        const estados = await obtenerEstadoUsuariosService();
        const mapa = new Map(estados.map(e => [e.correo, e]));
        setUsuarios(prev => prev.map(u => {
          const e = mapa.get(u.correo);
          return e ? { ...u, ultimoAcceso: e.ultimoAcceso, activo: e.activo } : u;
        }));
      } catch {
        /* fallo silencioso: no molestar al usuario por un refresco de estado */
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchPage = React.useCallback((page: number) =>
    debouncedSearch.trim()
      ? buscarUsuariosService(debouncedSearch.trim(), page, rolesAplicados)
      : obtenerUsuariosPaginadosService(page, rolesAplicados),
  [debouncedSearch, rolesAplicados]);

  // Confirma el filtro de roles al cerrar el selector (clic afuera). Solo consulta si cambió.
  const aplicarFiltroRoles = () => {
    const nombres = Array.from(rolesSeleccion as Set<React.Key>).map(String);
    const ids = rolesNombresAIds(nombres);
    const nuevoKey = [...ids].sort((a, b) => a - b).join(',');
    const actualKey = [...rolesAplicados].sort((a, b) => a - b).join(',');
    if (nuevoKey !== actualKey) {
      setRolesAplicados(ids);
    }
  };

  const cargarUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await fetchPage(1);
      setUsuarios(data.content);
      setTotalPages(data.pagination.totalPages);
      nextPageRef.current = 2;
      lastLoadedPageRef.current = 1;
    } catch (error) {
      logger.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  // Recarga todas las páginas ya visibles (usado tras crear/editar/eliminar)
  const recargarLista = async () => {
    const paginas = lastLoadedPageRef.current;
    try {
      setIsLoading(true);
      const resultados = await Promise.all(
        Array.from({ length: paginas }, (_, i) => fetchPage(i + 1))
      );
      setUsuarios(resultados.flatMap(r => r.content));
      setTotalPages(resultados[0].pagination.totalPages);
      nextPageRef.current = paginas + 1;
    } catch (error) {
      logger.error('Error al recargar lista:', error);
      toast.error('Error al actualizar la lista');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMasUsuarios = React.useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    const pageToLoad = nextPageRef.current;
    try {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      const data = await fetchPage(pageToLoad);
      setUsuarios(prev => {
        const existentes = new Set(prev.map(u => u.correo));
        const nuevos = data.content.filter(u => !existentes.has(u.correo));
        return [...prev, ...nuevos];
      });
      nextPageRef.current = pageToLoad + 1;
      lastLoadedPageRef.current = pageToLoad;
    } catch (error) {
      logger.error('Error cargando más usuarios:', error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [fetchPage]);

  // Scroll listener — mismo patrón que inventario.tsx
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isLoading || isLoadingRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      if (scrollTop + clientHeight > scrollHeight - 300) {
        if (nextPageRef.current <= totalPages) {
          cargarMasUsuarios();
        }
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isLoading, usuarios.length, totalPages, cargarMasUsuarios]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setUsuarioEditando(null);
    setFormData({
      primeroNombre: '',
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      username: '',
      email: '',
      password: '',
      confirmarPassword: '',
      rol: 'Profesor',
      fotoPerfil: undefined
    });
    setInitialFormData(null);
    setSelectedRolForm(new Set(['Profesor']));
    setArchivoFoto(null);
    onOpen();
  };

  const abrirModalEditar = (usuario: IUsuario) => {
    setModoEdicion(true);
    setUsuarioEditando(usuario);

    // Usar idRol para mapear al nombre exacto del selector (evita mismatch con el string formateado)
    const rolParaSelector: RolUsuario = usuario.idRol
      ? obtenerNombreRolPorId(usuario.idRol)
      : usuario.rol;

    const datosBase = {
      primeroNombre: usuario.primerNombre || '',
      segundoNombre: usuario.segundoNombre || '',
      apellidoPaterno: usuario.apellidoPaterno || '',
      apellidoMaterno: usuario.apellidoMaterno || '',
      username: usuario.username || usuario.correo.split('@')[0],
      email: usuario.correo,
      password: '',
      confirmarPassword: '',
      rol: rolParaSelector,
      fotoPerfil: usuario.fotoPerfil
    };

    setFormData(datosBase);
    setInitialFormData(datosBase);
    setSelectedRolForm(new Set([rolParaSelector]));
    setArchivoFoto(null);
    onOpen();
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.warning('Por favor seleccione una imagen válida');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.warning('La imagen no debe superar los 2MB');
        return;
      }
      setArchivoFoto(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const fieldsRequired = [
        formData.primeroNombre,
        formData.apellidoPaterno,
        formData.username,
        formData.email,
        formData.rol
      ];

      if (fieldsRequired.some(f => !f)) {
        toast.warning('Por favor complete todos los campos obligatorios');
        return;
      }

      if (!modoEdicion && !formData.password) {
        toast.warning('La contraseña es obligatoria para nuevos usuarios');
        return;
      }

      let fotoBase64 = formData.fotoPerfil;
      if (archivoFoto) {
        fotoBase64 = await subirFotoPerfilService(archivoFoto);
      }

      const dataConFoto = {
        ...formData,
        fotoPerfil: fotoBase64
      };

      if (modoEdicion && usuarioEditando) {
        const dataActualizacion: IUsuarioActualizacion = {
          primeroNombre: dataConFoto.primeroNombre,
          segundoNombre: dataConFoto.segundoNombre,
          apellidoPaterno: dataConFoto.apellidoPaterno,
          apellidoMaterno: dataConFoto.apellidoMaterno,
          username: dataConFoto.username,
          email: dataConFoto.email,
          rol: dataConFoto.rol as RolUsuario,
          fotoPerfil: dataConFoto.fotoPerfil
        };

        if (formData.password) {
          dataActualizacion.password = formData.password;
        }

        await actualizarUsuarioService(usuarioEditando.correo, dataActualizacion);
        toast.success('Usuario actualizado correctamente');
      } else {
        await crearUsuarioService(dataConFoto);
        toast.success('Usuario creado correctamente');
      }

      await recargarLista();
      onOpenChange();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (usuario: IUsuario) => {
    if (usuarioActual?.rol !== 'Administrador') {
      toast.warning('Solo el rol Administrador puede desactivar usuarios.');
      return;
    }

    const result = await confirm(
      `Esta acción desactivará al usuario ${usuario.nombreCompleto}.`,
      {
        title: 'Desactivar usuario',
        confirmText: 'Desactivar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextLabel: 'Escribe "ELIMINAR" para confirmar',
        requireTextHelper: 'Usa esta opción solo para depurar datos de prueba.',
      }
    );
    if (!result) {
      return;
    }

    try {
      await eliminarUsuarioService(usuario.correo);
      toast.success('Usuario desactivado correctamente');
      await recargarLista();
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar usuario');
    }
  };

  // No hay filtros adicionales por ahora
  const usuariosFiltrados = usuarios;

  const isFormInvalid = React.useMemo(() => {
    const { primeroNombre, apellidoPaterno, username, email, password, confirmarPassword, rol } = formData;

    if (!primeroNombre || !apellidoPaterno || !username || !email || !rol) return true;
    if (username.length < 8) return true;
    if (!email.includes('@') || !email.includes('.')) return true;

    if (!modoEdicion) {
      if (!password || password.length < 8) return true;
      if (password !== confirmarPassword) return true;
    } else {
      if (password && password.length > 0) {
        if (password.length < 8) return true;
        if (password !== confirmarPassword) return true;
      }
    }

    if (modoEdicion && initialFormData) {
      const hasDataChanges =
        primeroNombre !== initialFormData.primeroNombre ||
        formData.segundoNombre !== initialFormData.segundoNombre ||
        apellidoPaterno !== initialFormData.apellidoPaterno ||
        formData.apellidoMaterno !== initialFormData.apellidoMaterno ||
        username !== initialFormData.username ||
        email !== initialFormData.email ||
        rol !== initialFormData.rol ||
        (password !== '' && password.length >= 8);

      const hasPhotoChanges = archivoFoto !== null;
      if (!hasDataChanges && !hasPhotoChanges) return true;
    }

    return false;
  }, [formData, modoEdicion, initialFormData, archivoFoto]);

  const getColorRol = (rol: string) => {
    switch (rol) {
      case 'Administrador': return 'danger';
      case 'Co-Administrador': return 'warning';
      case 'Gestor de Pedidos': return 'primary';
      case 'Profesor a Cargo': return 'success';
      case 'Encargado de Bodega': return 'secondary';
      case 'Asistente de Bodega': return 'default';
      case 'Docente': case 'Profesor': return 'success';
      default: return 'default';
    }
  };

  // 10 min = ventana activa para considerar al usuario en línea
  const UMBRAL_EN_LINEA_MS = 10 * 60 * 1000;

  const estaEnLinea = (usuario: IUsuario): boolean => {
    if (!usuario.activo || !usuario.ultimoAcceso) return false;
    return Date.now() - new Date(usuario.ultimoAcceso).getTime() < UMBRAL_EN_LINEA_MS;
  };

  const getEstadoOnline = (usuario: IUsuario): { color: 'success' | 'danger' | 'default'; label: string; tooltip: string } => {
    if (!usuario.activo) return { color: 'danger', label: 'Inactivo', tooltip: 'Cuenta desactivada' };
    if (estaEnLinea(usuario)) return { color: 'success', label: 'En línea', tooltip: 'Con actividad en los últimos 10 minutos' };
    return { color: 'default', label: 'Desconectado', tooltip: usuario.ultimoAcceso ? 'Sin actividad reciente en el sistema' : 'Nunca ha iniciado sesión' };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Estado y lógica de la pestaña "Roles y permisos" (solo Administrador)
  // ═══════════════════════════════════════════════════════════════════════

  const restaurarModal = useDisclosure();

  const [localPermissions,  setLocalPermissions]  = React.useState<RolePermission[]>([]);
  const [saveStatus,        setSaveStatus]        = React.useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [permIsLoading,     setPermIsLoading]     = React.useState(false);
  const [isRestoring,       setIsRestoring]       = React.useState(false);
  const [confirmarTexto,    setConfirmarTexto]     = React.useState('');
  const [message,           setMessage]           = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errorState,        setErrorState]        = React.useState<{ is403: boolean; message: string } | null>(null);
  const [collapsedGroups,   setCollapsedGroups]   = React.useState<Record<string, boolean>>({});

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const permMatrixLoadedRef = React.useRef(false);

  const toggleGroup = (title: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  // Módulos que SÍ existen en la BD (vienen en la matriz del backend). Un módulo
  // de la vista que no esté aquí NO se puede guardar: el backend solo conoce los
  // módulos de la tabla `modulo`, así que hay que crearlos en la BD primero.
  const availableModules = React.useMemo(() => {
    const s = new Set<string>();
    localPermissions.forEach((rp) => Object.keys(rp.permissions).forEach((k) => s.add(k)));
    return s;
  }, [localPermissions]);

  const missingModules = React.useMemo(
    () => ALL_MODULES.filter((m) => localPermissions.length > 0 && !availableModules.has(m)),
    [availableModules, localPermissions.length]
  );

  // ── Cargar la matriz desde el backend ───────────────────────────────────────

  const loadMatrix = React.useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('idle');
    setPermIsLoading(true);
    setErrorState(null);
    setMessage(null);
    try {
      const data = await permissionService.getPermissions();
      // El Administrador siempre tiene control total — no se muestra en la matriz editable
      setLocalPermissions(data.filter(rp => rp.role !== 'Administrador'));
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setErrorState({ is403: true, message: 'No tienes permisos para ver la matriz de permisos.' });
      } else {
        setMessage({ type: 'error', text: 'Error al cargar los permisos. Verifica que el servidor esté activo.' });
      }
    } finally {
      setPermIsLoading(false);
    }
  }, []);

  // Carga perezosa: solo pide la matriz la primera vez que se abre la pestaña Roles
  // (evita el fetch para usuarios que nunca la visitan).
  React.useEffect(() => {
    if (activeTab === 'roles' && isAdmin && !permMatrixLoadedRef.current) {
      permMatrixLoadedRef.current = true;
      loadMatrix();
    }
  }, [activeTab, isAdmin, loadMatrix]);

  // ── Auto-guardado ───────────────────────────────────────────────────────────

  const autoSave = async (permissionsToSave: RolePermission[]) => {
    setSaveStatus('saving');
    try {
      await permissionService.savePermissions(permissionsToSave);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  // ── Cambiar un nivel de acceso en el estado local ───────────────────────────

  const handlePermissionChange = (roleIndex: number, moduleKey: ModuleKey, newValue: ModulePermissions) => {
    let permissionsForSave: RolePermission[] = [];

    setLocalPermissions((prev) => {
      const updated = [...prev];
      const newPerms = { ...updated[roleIndex].permissions, [moduleKey]: newValue };

      // Cascada hacia abajo: recursiva, propaga las perms reales del padre.
      // - READ_MODULES: capean a Lectura (none si padre es none).
      // - ACTION_MODULES: 'write' si padre tiene acceso general; los de ACTION_REQUIRES_UPDATE
      //   solo 'write' si padre tiene puedeActualizar.
      // - CrudCell/resto: copia bit a bit las perms del padre.
      const downQueue: { key: ModuleKey; perms: ModulePermissions }[] = [{ key: moduleKey, perms: newValue }];
      const downVisited = new Set<ModuleKey>([moduleKey]);
      while (downQueue.length > 0) {
        const { key: current, perms: parentPerms } = downQueue.shift()!;
        const parentLevel = levelFromPermissions(parentPerms);
        for (const child of MODULE_CHILDREN[current] ?? []) {
          if (downVisited.has(child)) continue;
          downVisited.add(child);
          let childPerms: ModulePermissions;
          if (READ_MODULES.has(child)) {
            childPerms = permsFromLevel(parentLevel === 'none' ? 'none' : 'read');
          } else if (ACTION_MODULES.has(child)) {
            const hasWrite = ACTION_REQUIRES_UPDATE.has(child)
              ? !!parentPerms.puedeActualizar
              : parentLevel === 'write';
            childPerms = permsFromLevel(hasWrite ? 'write' : 'none');
          } else {
            childPerms = { ...parentPerms };
          }
          newPerms[child] = childPerms;
          downQueue.push({ key: child, perms: childPerms });
        }
      }

      // Cascada hacia arriba: recalcula el nivel de cada ancestro como el máximo
      // de TODOS sus hijos directos (en newPerms). Sube y también baja con el resto.
      const upQueue: ModuleKey[] = [moduleKey];
      const upVisited = new Set<ModuleKey>();
      while (upQueue.length > 0) {
        const current = upQueue.shift()!;
        if (upVisited.has(current)) continue;
        upVisited.add(current);
        for (const parent of MODULE_PARENTS[current] ?? []) {
          const siblings = MODULE_CHILDREN[parent] ?? [];
          let maxLevel: AccessLevel = 'none';
          for (const sib of siblings) {
            const sl = levelFromPermissions(newPerms[sib]);
            if (sl === 'write') { maxLevel = 'write'; break; }
            if (sl === 'read') maxLevel = 'read';
          }
          if (READ_MODULES.has(parent) && maxLevel === 'write') maxLevel = 'read';
          const currentParentLevel = levelFromPermissions(newPerms[parent]);
          if (ACCESS_HIERARCHY[maxLevel] > ACCESS_HIERARCHY[currentParentLevel]) {
            newPerms[parent] = permsFromLevel(maxLevel);
            upQueue.push(parent);
          }
        }
      }

      updated[roleIndex] = { ...updated[roleIndex], permissions: newPerms };
      permissionsForSave = updated;
      return updated;
    });

    setMessage(null);
    setSaveStatus('pending');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void autoSave(permissionsForSave);
    }, 700);
  };

  // ── Restaurar permisos predeterminados ─────────────────────────────────────

  const handleRestaurar = async () => {
    setIsRestoring(true);
    try {
      await permissionService.restaurarPredeterminado();
      await refreshPermissions();
      await loadMatrix();
      restaurarModal.onClose();
      setMessage({ type: 'success', text: '¡Permisos restaurados a los valores predeterminados!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error al restaurar los permisos predeterminados.' });
    } finally {
      setIsRestoring(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-8 space-y-6 font-sans">
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as 'usuarios' | 'roles')}
        variant="underlined"
        color="primary"
        classNames={{ tabList: 'gap-6' }}
      >
        <Tab key="usuarios" title="Usuarios" />
        {isAdmin && <Tab key="roles" title="Roles y permisos" />}
      </Tabs>

      {activeTab === 'usuarios' && (
        isLoading ? (
          <TableSkeleton rows={8} columns={USUARIOS_TABLE_COLS} />
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Encabezado */}
          <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
            <CardBody className="p-6">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="w-full md:w-1/3">
                  <Input
                    placeholder="Buscar por nombre o correo..."
                    value={filtro}
                    onValueChange={setFiltro}
                    startContent={<Icon icon="lucide:search" className="text-default-400" />}
                    isClearable
                    onClear={() => setFiltro('')}
                    variant="bordered"
                    classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                  />
                </div>

                <div className="w-full md:w-1/3">
                  <Select
                    aria-label="Filtrar por rol"
                    selectionMode="multiple"
                    placeholder="Todos los roles"
                    selectedKeys={rolesSeleccion}
                    onSelectionChange={setRolesSeleccion}
                    onOpenChange={(open) => { if (!open) aplicarFiltroRoles(); }}
                    variant="bordered"
                    startContent={<Icon icon="lucide:filter" className="text-default-400 flex-shrink-0" />}
                    classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                    renderValue={(items) =>
                      items.length === 0
                        ? 'Todos los roles'
                        : `${items.length} rol${items.length > 1 ? 'es' : ''} seleccionado${items.length > 1 ? 's' : ''}`
                    }
                  >
                    {ROLES.map((rol) => (
                      <SelectItem key={rol}>{rol}</SelectItem>
                    ))}
                  </Select>
                </div>

                {usuPuedeCrear && (
                <Button
                  color="primary"
                  variant="solid"
                  className="font-bold text-secondary shadow-md w-full md:w-auto"
                  startContent={<Icon icon="lucide:user-plus" width={20} />}
                  onPress={abrirModalCrear}
                >
                  Nuevo Usuario
                </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
            <CardBody className="p-0">
              <div ref={scrollerRef} className="overflow-auto max-h-[calc(100vh-300px)] min-h-[300px] rounded-xl">
                <div className="min-w-[900px] w-full">
              <Table
                aria-label="Tabla de usuarios"
                removeWrapper
                layout="fixed"
                classNames={{
                  table: "w-full",
                  th: "bg-default-100 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-12 sticky top-0 z-20 border-b border-default-200/50 shadow-sm outline-none",
                  td: "py-3 border-b border-default-50 dark:border-default-50/20 group-data-[last=true]:border-none"
                }}
              >
                <TableHeader>
                  <TableColumn align="center" width="25%">USUARIO</TableColumn>
                  <TableColumn align="center" width="15%">NOMBRE USUARIO</TableColumn>
                  <TableColumn align="center" width="20%">CORREO</TableColumn>
                  <TableColumn align="center" width="15%">ROL</TableColumn>
                  <TableColumn align="center" width="10%">ESTADO</TableColumn>
                  <TableColumn align="center" width="15%">ÚLTIMO ACCESO</TableColumn>
                  <TableColumn align="center" width={100}>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody
                  emptyContent={
                    <div className="py-12 text-center text-default-400">
                      <Icon icon="lucide:users" className="mx-auto mb-3 opacity-50" width={48} />
                      <p className="text-lg font-medium">No se encontraron usuarios</p>
                    </div>
                  }
                >
                  {usuariosFiltrados.map((usuario) => (
                    <TableRow key={usuario.id + usuario.correo} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={usuario.fotoPerfil}
                            name={usuario.nombreCompleto}
                            size="md"
                            isBordered
                            color={estaEnLinea(usuario) ? "success" : !usuario.activo ? "danger" : "default"}
                            className="flex-shrink-0"
                            classNames={{ img: "scale-90" }}
                          />
                          <div className="overflow-hidden">
                            <Tooltip content={usuario.nombreCompleto} delay={1000}>
                              <p className="font-semibold text-secondary dark:text-foreground truncate">{usuario.nombreCompleto}</p>
                            </Tooltip>
                            {(usuario.id === usuarioActual?.id || usuario.nombreCompleto === usuarioActual?.nombre) && (
                              <Chip size="sm" color="primary" variant="flat" className="text-[10px] h-5">Tú</Chip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip content={usuario.username} delay={1000}>
                          <span className="text-default-600 truncate block">{usuario.username || '—'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip content={usuario.correo} delay={1000}>
                          <span className="text-default-600 truncate block">{usuario.correo}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={getColorRol(usuario.rol)}
                          variant="flat"
                          className="font-medium"
                        >
                          {usuario.rol}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const estado = getEstadoOnline(usuario);
                          return (
                            <Tooltip content={estado.tooltip} delay={600} size="sm">
                              <Chip
                                size="sm"
                                color={estado.color}
                                variant="dot"
                                className="border-none cursor-default"
                              >
                                {estado.label}
                              </Chip>
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-default-600">
                          {usuario.ultimoAcceso
                            ? new Date(usuario.ultimoAcceso).toLocaleString('es-CL')
                            : <span className="text-default-400 italic">Nunca</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Tooltip content={usuPuedeEditar ? "Editar" : "Sin permiso de edición"}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => abrirModalEditar(usuario)}
                              isDisabled={!usuPuedeEditar}
                              className="text-default-400 hover:text-primary"
                            >
                              <Icon icon="lucide:edit" width={18} />
                            </Button>
                          </Tooltip>

                          {usuario.activo && (
                            <Tooltip content={!usuPuedeEliminar ? "Sin permiso de desactivación" : "Desactivar"}>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => handleEliminar(usuario)}
                                isDisabled={
                                  !usuPuedeEliminar ||
                                  usuario.id === usuarioActual?.id ||
                                  usuario.nombreCompleto === usuarioActual?.nombre
                                }
                                className="text-default-400 hover:text-danger"
                              >
                                <Icon icon="lucide:user-x" width={18} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {isLoadingMore && (
                <div className="flex justify-center py-4 border-t border-default-100 dark:border-default-50">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span>Cargando más usuarios...</span>
                  </div>
                </div>
              )}
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
        )
      )}

      {activeTab === 'roles' && isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >

          {/* ── Leyenda de niveles + botones de acción ── */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-default-400 font-medium">Niveles:</span>
            {ACCESS_OPTIONS.map((o) => (
              <div key={o.value} className="flex items-center gap-1.5 text-xs">
                <AccessChip level={o.value} />
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-default-400 ml-2">
              <Icon icon="lucide:shield-check" width={12} />
              <span>El Administrador siempre tiene Escritura total (columna oculta)</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {saveStatus !== 'idle' && (
                <span className={`text-xs flex items-center gap-1.5 ${
                  saveStatus === 'pending' ? 'text-default-400' :
                  saveStatus === 'saving'  ? 'text-[#FFB800]'   :
                  saveStatus === 'saved'   ? 'text-success-500' :
                                             'text-danger-500'
                }`}>
                  {saveStatus === 'pending' && <><Icon icon="lucide:clock"         width={13} /> Cambios pendientes...</>}
                  {saveStatus === 'saving'  && <><Icon icon="lucide:loader-2"      width={13} className="animate-spin" /> Guardando...</>}
                  {saveStatus === 'saved'   && <><Icon icon="lucide:check-circle"  width={13} /> Guardado</>}
                  {saveStatus === 'error'   && <><Icon icon="lucide:alert-circle"  width={13} /> Error al guardar</>}
                </span>
              )}
              <Button
                variant="flat"
                color="default"
                startContent={<Icon icon="lucide:refresh-cw" width={16} />}
                onPress={loadMatrix}
                isLoading={permIsLoading}
                isDisabled={saveStatus === 'saving' || isRestoring}
                size="sm"
              >
                Recargar
              </Button>
              <Button
                variant="flat"
                color="danger"
                startContent={<Icon icon="lucide:rotate-ccw" width={16} />}
                onPress={() => { setConfirmarTexto(''); restaurarModal.onOpen(); }}
                isDisabled={permIsLoading || saveStatus === 'saving' || isRestoring || !!errorState}
                size="sm"
              >
                Restaurar Predeterminado
              </Button>
            </div>
          </div>

          {/* ── Mensajes de estado ── */}
          {message && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-success-50 border border-success-200 text-success-700 dark:bg-success-50/10 dark:text-success-400'
                : 'bg-danger-50 border border-danger-200 text-danger-700 dark:bg-danger-50/10 dark:text-danger-400'
            }`}>
              <Icon icon={message.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={16} />
              {message.text}
            </div>
          )}

          {/* ── Aviso: módulos de la vista que no existen en la BD ── */}
          {!permIsLoading && !errorState && missingModules.length > 0 && (
            <div className="p-3 rounded-xl border border-warning-200 bg-warning-50 dark:bg-warning-50/10 text-warning-800 dark:text-warning-400 text-sm flex items-start gap-2">
              <Icon icon="lucide:database" width={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{missingModules.length} módulo(s) todavía no existen en la base de datos.</p>
                <p className="text-xs mt-0.5">
                  Sus celdas están deshabilitadas y <strong>no se pueden guardar</strong> hasta crearlos en la tabla <code>modulo</code>.
                  Corre el script SQL (o el bloque incremental) para agregarlos:{' '}
                  <span className="font-medium">{missingModules.map((m) => MODULE_LABELS[m]).join(', ')}</span>.
                </p>
              </div>
            </div>
          )}

          {/* ── Matriz de permisos ── */}
          <Card className="shadow-sm">
            <CardHeader className="px-6 py-4 border-b border-divider">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:grid" width={16} className="text-[#FFB800]" />
                <span className="font-semibold text-sm">
                  Módulos ({ALL_MODULES.length}) × Roles ({localPermissions.length})
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">

                  {/* ── Cabecera: nombre de los roles ── */}
                  <thead>
                    <tr className="bg-default-50 dark:bg-default-100/5 border-b border-divider">
                      {/* Columna fija: Módulo */}
                      <th className="sticky left-0 z-10 bg-default-50 dark:bg-content1 px-5 py-3 text-left text-xs font-semibold text-default-500 uppercase tracking-wider min-w-[200px] border-r border-divider">
                        Módulo
                      </th>
                      {permIsLoading ? null : localPermissions.map((rp) => (
                        <th
                          key={rp.role}
                          className="px-4 py-3 text-center text-xs font-bold text-default-700 uppercase tracking-wider min-w-[160px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-7 h-7 rounded-full bg-[#FFB800]/10 flex items-center justify-center">
                              <Icon icon="lucide:user" width={14} className="text-[#FFB800]" />
                            </div>
                            <span className="text-[11px] leading-tight text-center">{rp.role}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* ── Cuerpo: módulos × selectores ── */}
                  <tbody className="divide-y divide-divider">
                    {permIsLoading ? (
                      <tr>
                        <td colSpan={(localPermissions.length || 1) + 1} className="py-4">
                          <TableSkeleton rows={8} columns={(localPermissions.length || 1) + 1} />
                        </td>
                      </tr>
                    ) : errorState ? (
                      <tr>
                        <td colSpan={(localPermissions.length || 1) + 1} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Icon icon="lucide:shield-off" width={48} className="text-danger-300" />
                            <p className="font-semibold text-danger-600">{errorState.message}</p>
                            {errorState.is403 && (
                              <p className="text-sm text-default-400">Contacta al administrador del sistema.</p>
                            )}
                            <Button size="sm" variant="flat" onPress={loadMatrix}>
                              Reintentar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      MODULE_GROUPS.map((group) => {
                        const collapsed = collapsedGroups[group.title];
                        return (
                          <React.Fragment key={group.title}>
                            {/* Fila de categoría (colapsable) */}
                            <tr
                              className="bg-default-100/70 dark:bg-default-100/10 border-y border-divider cursor-pointer select-none"
                              onClick={() => toggleGroup(group.title)}
                            >
                              <td className="sticky left-0 z-10 bg-default-100/70 dark:bg-content2 px-5 py-2 border-r border-divider">
                                <div className="flex items-center gap-2">
                                  <Icon icon={collapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'} width={14} className="text-default-500" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-default-500">{group.title}</span>
                                  <span className="text-[10px] text-default-400">({group.modules.length})</span>
                                </div>
                              </td>
                              <td colSpan={localPermissions.length} className="bg-default-100/70 dark:bg-content2" />
                            </tr>

                            {/* Filas de módulos del grupo */}
                            {!collapsed && (() => {
                              const bodegaStartIdx = group.modules.indexOf('BODEGA_TRANSITO' as ModuleKey);
                              return group.modules.map((moduleKey, modIdx) => {
                              const inBodegaCtx = bodegaStartIdx !== -1 && modIdx >= bodegaStartIdx;
                              const label      = (inBodegaCtx && BODEGA_LABEL_OVERRIDES[moduleKey]) ? BODEGA_LABEL_OVERRIDES[moduleKey]! : MODULE_LABELS[moduleKey];
                              const icon       = MODULE_ICONS[moduleKey];
                              const isSubSub   = SUB_SUBMODULES.has(moduleKey);
                              const isSub      = !isSubSub && SUBMODULES.has(moduleKey);
                              const inDb       = availableModules.has(moduleKey);
                              const sectionHdr = SECTION_HEADERS[moduleKey];

                              return (
                                <React.Fragment key={`${moduleKey}-${modIdx}`}>
                                  {sectionHdr && (
                                    <tr>
                                      <td className="sticky left-0 z-10 bg-default-50/80 dark:bg-content1/80 pl-8 pr-5 py-1 border-t border-default-200 dark:border-default-100">
                                        <div className="flex items-center gap-1.5">
                                          <Icon icon="lucide:corner-down-right" width={10} className="text-default-300 shrink-0" />
                                          <span className="text-[9px] font-bold uppercase tracking-widest text-default-400 whitespace-nowrap">
                                            {sectionHdr}
                                          </span>
                                          <div className="flex-1 h-px bg-default-200 dark:bg-default-100 ml-1" />
                                        </div>
                                      </td>
                                      {localPermissions.map((rp) => (
                                        <td key={rp.role} className="border-t border-default-200 dark:border-default-100 bg-default-50/80 dark:bg-content1/80" />
                                      ))}
                                    </tr>
                                  )}
                                  <tr className={`hover:bg-default-50/50 dark:hover:bg-default-100/5 transition-colors ${!inDb ? 'opacity-70' : ''}`}>
                                    {/* Columna fija: nombre del módulo */}
                                    <td className={`sticky left-0 z-10 bg-white dark:bg-content1 py-2.5 border-r border-divider ${isSubSub ? 'pl-16 pr-5' : isSub ? 'pl-10 pr-5' : 'px-5'}`}>
                                      <div className="flex items-center gap-2">
                                        {isSubSub && <Icon icon="lucide:corner-down-right" width={10} className="text-default-200 shrink-0" />}
                                        {isSub && <Icon icon="lucide:corner-down-right" width={12} className="text-default-300 shrink-0" />}
                                        <div className={`rounded-lg bg-[#FFB800]/10 flex items-center justify-center shrink-0 ${isSubSub ? 'w-5 h-5' : isSub ? 'w-6 h-6' : 'w-7 h-7'}`}>
                                          <Icon icon={icon} width={isSubSub ? 10 : isSub ? 12 : 14} className="text-[#FFB800]" />
                                        </div>
                                        <span className={`font-medium text-default-800 dark:text-default-200 whitespace-nowrap ${isSubSub ? 'text-[11px]' : isSub ? 'text-xs' : 'text-sm'}`}>
                                          {label}
                                        </span>
                                        {!inDb && (
                                          <Tooltip content="Este módulo aún no existe en la base de datos. Créalo (corre el SQL) para poder asignar y guardar sus permisos." color="warning" className="text-xs max-w-[240px]">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning-600 bg-warning-50 dark:bg-warning-50/10 border border-warning-200 rounded px-1.5 py-0.5">
                                              <Icon icon="lucide:database" width={11} /> falta en BD
                                            </span>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </td>

                                    {/* Celdas por rol (sin Administrador): control según el tipo de módulo */}
                                    {localPermissions.map((rp, roleIdx) => {
                                      const perms = rp.permissions[moduleKey] ?? emptyModulePermissions();
                                      const CellControl = cellComponentFor(moduleKey);
                                      return (
                                        <td key={`${rp.role}-${moduleKey}`} className="px-3 py-2.5 text-center">
                                          <CellControl
                                            perms={perms}
                                            disabled={saveStatus === 'saving' || !inDb}
                                            onChange={(p) => handlePermissionChange(roleIdx, moduleKey, p)}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
                              );
                            });
                            })()}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* ── Nota informativa ── */}
          <div className="flex flex-col gap-2 text-xs text-default-500 bg-default-50 dark:bg-default-100/5 rounded-xl p-3 border border-divider">
            <div className="flex items-start gap-2">
              <Icon icon="lucide:info" width={14} className="shrink-0 mt-0.5 text-[#FFB800]" />
              <p className="text-default-400">
                Los cambios se guardan automáticamente al modificar un permiso y se aplican a todos los usuarios del rol de inmediato.
                El Administrador siempre mantiene acceso total y no puede ser restringido.
              </p>
            </div>
            <div className="border-t border-divider pt-2 space-y-1.5">
              <p className="font-semibold text-default-600">Cómo asignar permisos:</p>
              <div className="flex items-start gap-2">
                <Icon icon="lucide:mouse-pointer-click" width={12} className="shrink-0 mt-0.5 text-[#FFB800]" />
                <span>Haz clic en la celda de cada rol y <strong>marca las acciones</strong> que tendrá: <strong>Leer, Crear, Editar, Eliminar</strong>. Puedes combinarlas (p. ej. Leer + Editar sin Eliminar).</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="lucide:lock" width={12} className="shrink-0 mt-0.5 text-default-400" />
                <span><strong>Sin Acceso</strong> (nada marcado): el módulo no aparece en el menú ni por URL; no se muestra ningún ícono.</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="lucide:eye" width={12} className="shrink-0 mt-0.5 text-warning-500" />
                <span><strong>Lectura</strong> (solo Leer): ve la información y usa filtros/buscadores, pero los íconos de crear/editar/eliminar aparecen apagados y no clickeables.</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="lucide:pencil" width={12} className="shrink-0 mt-0.5 text-success-500" />
                <span><strong>Escritura</strong> (alguna acción marcada): se habilitan exactamente los íconos correspondientes. Marcar cualquier acción de escritura activa Leer automáticamente.</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="lucide:package-open" width={12} className="shrink-0 mt-0.5 text-[#FFB800]" />
                <span><strong>Pedido Semanal a Bodega:</strong> la página tiene Sin Acceso / Lectura / Escritura (Lectura = ver con íconos apagados). Sus acciones <strong>Nuevo, Editar, Inactivar y Eliminar</strong> son solo <strong>Sin permiso o Escritura</strong>. Poner la página en Escritura las activa todas; luego puedes apagar las que quieras.</span>
              </div>
            </div>
          </div>

        </motion.div>
      )}

      {/* ── Modal crear/editar usuario ── */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-secondary-50 dark:bg-secondary-50/10">
                <div className="flex items-center gap-2">
                  <Icon icon={modoEdicion ? "lucide:user-cog" : "lucide:user-plus"} className="text-secondary dark:text-secondary-400" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </span>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Primer Nombre"
                      placeholder="Juan"
                      value={formData.primeroNombre}
                      onValueChange={(val) => setFormData({ ...formData, primeroNombre: val })}
                      isRequired
                      maxLength={50}
                      description={`${formData.primeroNombre.length}/50`}
                    />
                    <Input
                      label="Segundo Nombre"
                      placeholder="Andrés"
                      value={formData.segundoNombre}
                      onValueChange={(val) => setFormData({ ...formData, segundoNombre: val })}
                      maxLength={50}
                      description={`${(formData.segundoNombre || '').length}/50`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Apellido Paterno"
                      placeholder="Pérez"
                      value={formData.apellidoPaterno}
                      onValueChange={(val) => setFormData({ ...formData, apellidoPaterno: val })}
                      isRequired
                      maxLength={50}
                      description={`${formData.apellidoPaterno.length}/50`}
                    />
                    <Input
                      label="Apellido Materno"
                      placeholder="López"
                      value={formData.apellidoMaterno}
                      onValueChange={(val) => setFormData({ ...formData, apellidoMaterno: val })}
                      maxLength={50}
                      description={`${(formData.apellidoMaterno || '').length}/50`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Username"
                      placeholder="jperez"
                      value={formData.username}
                      onValueChange={(val) => setFormData({ ...formData, username: val })}
                      isRequired
                      maxLength={50}
                      description={`${formData.username.length}/50 (Min. 8)`}
                    />
                    <Input
                      type="email"
                      label="Correo Electrónico"
                      placeholder="usuario@sistema.cl"
                      value={formData.email}
                      onValueChange={(val) => setFormData({ ...formData, email: val })}
                      isRequired
                      maxLength={75}
                      description={`${formData.email.length}/75`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="password"
                      label={modoEdicion ? 'Nueva Contraseña' : 'Contraseña'}
                      placeholder="••••••••"
                      value={formData.password}
                      onValueChange={(val) => setFormData({ ...formData, password: val })}
                      isRequired={!modoEdicion}
                      maxLength={30}
                      description={modoEdicion
                        ? (formData.password ? `${formData.password.length}/30 (Min. 8)` : "Dejar vacío para mantener la actual")
                        : `${formData.password.length}/30 (Min. 8)`
                      }
                      color={formData.password && formData.password.length < 8 ? "danger" : "default"}
                    />
                    <Input
                      type="password"
                      label="Confirmar Contraseña"
                      placeholder="••••••••"
                      value={formData.confirmarPassword}
                      onValueChange={(val) => setFormData({ ...formData, confirmarPassword: val })}
                      isRequired={!modoEdicion || (formData.password?.length ?? 0) > 0}
                      maxLength={30}
                      color={formData.confirmarPassword && formData.confirmarPassword !== formData.password ? "danger" : "default"}
                      description={formData.confirmarPassword && formData.confirmarPassword !== formData.password ? "No coincide" : ""}
                    />
                  </div>

                  <Select
                    key={`rol-${modoEdicion ? (usuarioEditando?.idUsuario ?? usuarioEditando?.id ?? 'edit') : 'create'}`}
                    label="Rol"
                    placeholder="Seleccione un rol"
                    defaultSelectedKeys={new Set([formData.rol])}
                    onSelectionChange={(keys) => {
                      setSelectedRolForm(keys);
                      const selectedKey = Array.from(keys)[0];
                      if (selectedKey) {
                        setFormData(prev => ({ ...prev, rol: selectedKey as RolUsuario }));
                      }
                    }}
                    isRequired
                  >
                    {ROLES.map((rol) => (
                      <SelectItem key={rol}>{rol}</SelectItem>
                    ))}
                  </Select>

                  <div className="p-4 rounded-2xl bg-default-50 dark:bg-default-100/50 border border-default-200 dark:border-default-100">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-2.5 rounded-xl bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400">
                        <Icon icon="lucide:construction" width={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-secondary dark:text-foreground">Carga de Fotos en Mantenimiento</p>
                        <p className="text-xs text-default-500">Esta función no está disponible temporalmente.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-content1 border border-dashed border-default-300 dark:border-default-200 opacity-60">
                      <Button
                        size="sm"
                        variant="flat"
                        isDisabled
                        className="font-semibold"
                        startContent={<Icon icon="lucide:image-plus" width={16} />}
                      >
                        Seleccionar archivo
                      </Button>
                      <span className="text-xs text-default-400 italic">No disponible por actualizaciones</span>
                    </div>
                  </div>

                  {formData.fotoPerfil && (
                    <div className="flex justify-center pt-2">
                      <Avatar
                        src={formData.fotoPerfil}
                        name={formData.primeroNombre}
                        size="lg"
                        isBordered
                      />
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  isDisabled={isFormInvalid || isSubmitting}
                  className="font-bold text-secondary shadow-md"
                  startContent={<Icon icon="lucide:save" />}
                >
                  {modoEdicion ? 'Actualizar' : 'Crear Usuario'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal Restaurar Predeterminado (pestaña Roles) ── */}
      <Modal isOpen={restaurarModal.isOpen} onOpenChange={restaurarModal.onOpenChange} size="sm">
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex items-center gap-2 text-danger">
                <Icon icon="lucide:rotate-ccw" width={18} />
                Restaurar Permisos Predeterminados
              </ModalHeader>
              <ModalBody className="space-y-3">
                <div className="bg-danger-50 border border-danger-200 rounded-lg px-3 py-2.5 text-sm text-danger-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Icon icon="lucide:alert-triangle" width={14} /> Advertencia
                  </p>
                  <p>
                    Esta acción sobreescribirá <strong>todos los permisos</strong> de todos los roles
                    con los valores predeterminados del sistema. Los cambios personalizados se perderán.
                  </p>
                </div>
                <Input
                  label='Escriba "CONFIRMAR" para continuar'
                  placeholder="CONFIRMAR"
                  value={confirmarTexto}
                  onValueChange={setConfirmarTexto}
                  variant="bordered"
                  color={confirmarTexto.trim().toUpperCase() === 'CONFIRMAR' ? 'success' : 'default'}
                  endContent={confirmarTexto.trim().toUpperCase() === 'CONFIRMAR'
                    ? <Icon icon="lucide:check-circle" width={16} className="text-success" /> : null}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={isRestoring}>Cancelar</Button>
                <Button
                  color="danger"
                  isLoading={isRestoring}
                  isDisabled={confirmarTexto.trim().toUpperCase() !== 'CONFIRMAR'}
                  onPress={handleRestaurar}
                  startContent={!isRestoring && <Icon icon="lucide:rotate-ccw" width={14} />}
                >
                  Restaurar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default GestionUsuariosPage;
