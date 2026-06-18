/**
 * PÁGINA: GESTIÓN DE ROLES Y PERMISOS
 *
 * Matriz interactiva: Módulos (filas) × Roles (columnas)
 * Cada celda tiene un selector de nivel de acceso: Sin Acceso / Solo Lectura / Escritura
 *
 * - Solo el Administrador puede acceder y editar.
 * - El rol Administrador está bloqueado en "Escritura" (no editable).
 * - Los cambios se persisten en la base de datos vía API.
 * - Colores corporativos de KuHub (amarillo #FFB800 / negro #1A1A1A).
 */

import React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Tooltip,
  useDisclosure,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usePermission } from '../contexts/permission-context';
import { usePageTitle } from '../hooks/usePageTitle';
import { permissionService } from '../services/permission-service';
import {
  AccessLevel,
  ModuleKey,
  ModulePermissions,
  MODULE_LABELS,
  MODULE_ICONS,
  RolePermission,
  emptyModulePermissions,
  levelFromPermissions,
} from '../types/permissions.types';

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
        'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
        'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
        'GPRV_ORDENES', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP',
      'GESTION_ACADEMICA',
      'HISTORICO_PEDIDOS', 'HIST_EXPORT_EXCEL',
    ],
  },
  {
    title: 'Inventario',
    modules: [
      'INVENTARIO', 'INV_CONTROL_MASIVO', 'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO',
      'GESTION_CATEGORIAS', 'GESTION_UNIDADES',
      'HISTORIAL_MOVIMIENTOS',
      'BODEGA_TRANSITO', 'BOD_CONTROL_MASIVO', 'BOD_ABASTECIMIENTO', 'GESTION_PEDIDOS_DIARIOS',
    ],
  },
  { title: 'Usuarios', modules: ['GESTION_ROLES', 'GESTION_USUARIOS'] },
  {
    title: 'Sistema',
    modules: ['ADMIN_SISTEMA', 'ADMIN_BLOQUES_HORARIOS', 'ADMIN_SEMANAS', 'ADMIN_SALAS_RESERVAS', 'ADMIN_CONFIG_SISTEMA'],
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
  'ADMIN_BLOQUES_HORARIOS', 'ADMIN_SEMANAS', 'ADMIN_SALAS_RESERVAS', 'ADMIN_CONFIG_SISTEMA',
  'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
  'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
  'GPRV_ORDENES', 'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP',
  'INV_CONTROL_MASIVO', 'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO',
  'BOD_CONTROL_MASIVO', 'BOD_ABASTECIMIENTO',
  'HIST_EXPORT_EXCEL',
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
  GESTION_PROVEEDORES:   ['GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION', 'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV', 'GPRV_ORDENES'],
  GPRV_ORDENES:          ['GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP'],
  INVENTARIO:            ['INV_CONTROL_MASIVO', 'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO'],
  BODEGA_TRANSITO:       ['BOD_CONTROL_MASIVO', 'BOD_ABASTECIMIENTO'],
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

// ── Acciones CRUD seleccionables por celda ───────────────────────────────────
const CRUD_ACTIONS: { key: keyof ModulePermissions; label: string; icon: string }[] = [
  { key: 'puedeLeer',       label: 'Leer',     icon: 'lucide:eye' },
  { key: 'puedeCrear',      label: 'Crear',    icon: 'lucide:plus' },
  { key: 'puedeActualizar', label: 'Editar',   icon: 'lucide:pencil' },
  { key: 'puedeEliminar',   label: 'Eliminar', icon: 'lucide:trash-2' },
];

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
]);
const AGGREGATE_MODULES = new Set<ModuleKey>([
  'PEDIDO_SEMANAL_BODEGA', 'GESTION_SOLICITUDES', 'GESTION_PEDIDOS',
  'CONGLOMERADO_PEDIDOS', 'CONG_VISTA_CATEGORIAS',
  'GESTION_PROVEEDORES', 'GPRV_ORDENES',
  'HISTORICO_PEDIDOS',
]);
const ACTION_MODULES = new Set<ModuleKey>([
  'PEDIDO_SEM_CREAR', 'PEDIDO_SEM_EDITAR', 'PEDIDO_SEM_INACTIVAR', 'PEDIDO_SEM_ELIMINAR',
  'GEST_SOL_GESTIONAR', 'GEST_SOL_RECHAZAR',
  'SOLICITUD',
  'CONG_APROBAR_PEDIDO', 'CONG_RECHAZAR_PEDIDO',
  'GPRV_NUEVO_PROV', 'GPRV_SYNC_EXCEL', 'GPRV_GENERAR_ORDEN', 'GPRV_COTIZACION',
  'GPRV_CAMBIAR_ESTADO_PROV', 'GPRV_EDITAR_PROV', 'GPRV_ASIGNAR_PROD', 'GPRV_ELIMINAR_PROV',
  'GPRV_CANCELAR_OP', 'GPRV_EXPORT_OP',
  'INV_CONTROL_MASIVO', 'INV_SYNC_EXCEL', 'INV_ABASTECIMIENTO',
  'BOD_CONTROL_MASIVO', 'BOD_ABASTECIMIENTO',
  'HIST_EXPORT_EXCEL',
]);

const cellComponentFor = (moduleKey: ModuleKey): React.FC<CrudCellProps> =>
  ACTION_MODULES.has(moduleKey)    ? BinaryWriteCell :
  READ_MODULES.has(moduleKey)      ? BinaryReadCell :
  AGGREGATE_MODULES.has(moduleKey) ? TriStateCell :
                                     CrudCell;

// ── Página principal ──────────────────────────────────────────────────────────

const GestionRolesPage: React.FC = () => {
  usePageTitle('Gestión de Roles', 'Configura qué puede ver o editar cada rol en el sistema.', 'lucide:users');
  const { isAdmin, isLoading: permLoading, refreshPermissions, allPermissions } = usePermission();

  const restaurarModal = useDisclosure();

  const [localPermissions,  setLocalPermissions]  = React.useState<RolePermission[]>([]);
  const [isSaving,          setIsSaving]          = React.useState(false);
  const [isLoading,         setIsLoading]         = React.useState(false);
  const [isRestoring,       setIsRestoring]       = React.useState(false);
  const [confirmarTexto,    setConfirmarTexto]     = React.useState('');
  const [message,           setMessage]           = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errorState,        setErrorState]        = React.useState<{ is403: boolean; message: string } | null>(null);
  const [collapsedGroups,   setCollapsedGroups]   = React.useState<Record<string, boolean>>({});

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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // ── Cambiar un nivel de acceso en el estado local ───────────────────────────

  const handlePermissionChange = (roleIndex: number, moduleKey: ModuleKey, newValue: ModulePermissions) => {
    setLocalPermissions((prev) => {
      const updated = [...prev];
      const newPerms = { ...updated[roleIndex].permissions, [moduleKey]: newValue };

      // Cascada hacia abajo: el módulo "aglobado" copia su perfil CRUD a las acciones hijas.
      const children = MODULE_CHILDREN[moduleKey];
      if (children) {
        for (const child of children) newPerms[child] = { ...newValue };
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
          newPerms[parent] = permsFromLevel(maxLevel);
          upQueue.push(parent);
        }
      }

      updated[roleIndex] = { ...updated[roleIndex], permissions: newPerms };
      return updated;
    });
    setMessage(null);
  };

  // ── Guardar cambios ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await permissionService.savePermissions(localPermissions);
      await refreshPermissions(); // invalidar cache del contexto
      await loadMatrix();         // recargar matriz local
      setMessage({ type: 'success', text: '¡Permisos actualizados correctamente!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error al guardar los permisos.' });
    } finally {
      setIsSaving(false);
    }
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

  // ── Guard: solo Administrador ───────────────────────────────────────────────

  if (!permLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-danger-50 flex items-center justify-center">
          <Icon icon="lucide:shield-off" width={40} className="text-danger-500" />
        </div>
        <h2 className="text-2xl font-bold text-danger-600">Acceso Denegado</h2>
        <p className="text-default-500 max-w-sm">
          Solo el Administrador puede gestionar roles y permisos del sistema.
        </p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 pb-8">
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
          <div className="flex gap-2 ml-auto">
            <Button
              variant="flat"
              color="default"
              startContent={<Icon icon="lucide:refresh-cw" width={16} />}
              onPress={loadMatrix}
              isLoading={isLoading}
              isDisabled={isSaving || isRestoring}
              size="sm"
            >
              Recargar
            </Button>
            <Button
              variant="flat"
              color="danger"
              startContent={<Icon icon="lucide:rotate-ccw" width={16} />}
              onPress={() => { setConfirmarTexto(''); restaurarModal.onOpen(); }}
              isDisabled={isLoading || isSaving || isRestoring || !!errorState}
              size="sm"
            >
              Restaurar Predeterminado
            </Button>
            <Button
              style={{ backgroundColor: '#FFB800', color: '#1A1A1A' }}
              startContent={!isSaving && <Icon icon="lucide:save" width={16} />}
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={isLoading || isRestoring || !!errorState}
              size="sm"
              className="font-semibold"
            >
              Guardar Cambios
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
        {!isLoading && !errorState && missingModules.length > 0 && (
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
                    {isLoading ? null : localPermissions.map((rp) => (
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={(localPermissions.length || 1) + 1} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Spinner size="lg" color="warning" />
                          <span className="text-default-400 text-sm">Cargando permisos...</span>
                        </div>
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
                          {!collapsed && group.modules.map((moduleKey) => {
                            const label  = MODULE_LABELS[moduleKey];
                            const icon   = MODULE_ICONS[moduleKey];
                            const isSub  = SUBMODULES.has(moduleKey);
                            const inDb   = availableModules.has(moduleKey);

                            return (
                              <tr key={moduleKey} className={`hover:bg-default-50/50 dark:hover:bg-default-100/5 transition-colors ${!inDb ? 'opacity-70' : ''}`}>
                                {/* Columna fija: nombre del módulo */}
                                <td className={`sticky left-0 z-10 bg-white dark:bg-content1 py-2.5 border-r border-divider ${isSub ? 'pl-10 pr-5' : 'px-5'}`}>
                                  <div className="flex items-center gap-2">
                                    {isSub && <Icon icon="lucide:corner-down-right" width={12} className="text-default-300 shrink-0" />}
                                    <div className={`rounded-lg bg-[#FFB800]/10 flex items-center justify-center shrink-0 ${isSub ? 'w-6 h-6' : 'w-7 h-7'}`}>
                                      <Icon icon={icon} width={isSub ? 12 : 14} className="text-[#FFB800]" />
                                    </div>
                                    <span className={`font-medium text-default-800 dark:text-default-200 whitespace-nowrap ${isSub ? 'text-xs' : 'text-sm'}`}>
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
                                        disabled={isSaving || !inDb}
                                        onChange={(p) => handlePermissionChange(roleIdx, moduleKey, p)}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
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
              Los cambios se aplican a todos los usuarios de ese rol inmediatamente después de guardar.
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

      {/* ── Modal Restaurar Predeterminado ── */}
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

export default GestionRolesPage;
