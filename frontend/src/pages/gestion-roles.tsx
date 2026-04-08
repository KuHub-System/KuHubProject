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
  Spinner,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usePermission } from '../contexts/permission-context';
import { usePageTitle } from '../hooks/usePageTitle';
import { permissionService } from '../services/permission-service';
import {
  AccessLevel,
  ModuleKey,
  MODULE_LABELS,
  MODULE_ICONS,
  RolePermission,
} from '../types/permissions.types';

// ── Opciones de nivel de acceso ───────────────────────────────────────────────

const ACCESS_OPTIONS: { value: AccessLevel; label: string; chipColor: 'default' | 'warning' | 'success'; icon: string }[] = [
  { value: 'none',  label: 'Sin Acceso',    chipColor: 'default', icon: 'lucide:lock' },
  { value: 'read',  label: 'Solo Lectura',  chipColor: 'warning', icon: 'lucide:eye' },
  { value: 'write', label: 'Escritura',     chipColor: 'success', icon: 'lucide:pencil' },
];

// ── Orden de módulos (debe coincidir con orden_modulo en BD) ─────────────────

const MODULE_ORDER: ModuleKey[] = [
  'DASHBOARD',
  'INVENTARIO',
  'HISTORIAL_MOVIMIENTOS',
  'GESTION_CATEGORIAS',
  'GESTION_UNIDADES',
  'SOLICITUD',
  'GESTION_PEDIDOS',
  'GESTION_SOLICITUDES',
  'CONGLOMERADO_PEDIDOS',
  // 'GESTION_PROVEEDORES', // En cuarentena — no mostrar hasta confirmar si entra al sistema
  'BODEGA_TRANSITO',
  'GESTION_PEDIDOS_DIARIOS',
  'GESTION_RECETAS',
  'RAMOS_ADMIN',
  'GESTION_ROLES',
  'GESTION_USUARIOS',
  'ADMIN_SISTEMA',
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

// ── Selector de nivel de acceso ───────────────────────────────────────────────

interface AccessSelectorProps {
  value:    AccessLevel;
  disabled: boolean;
  locked:   boolean;
  onChange: (v: AccessLevel) => void;
}

const AccessSelector: React.FC<AccessSelectorProps> = ({ value, disabled, locked, onChange }) => {
  const display = locked ? 'write' : value;
  const opt = ACCESS_OPTIONS.find((o) => o.value === display) ?? ACCESS_OPTIONS[0];

  const bgClass =
    display === 'write' ? 'bg-success-50 border-success-200 text-success-700 dark:bg-success-50/10 dark:text-success-400' :
    display === 'read'  ? 'bg-warning-50 border-warning-200 text-warning-700 dark:bg-warning-50/10 dark:text-warning-400' :
                          'bg-default-100 border-default-200 text-default-500 dark:bg-default-50/10';

  if (locked) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold opacity-80 ${bgClass}`}>
        <Icon icon="lucide:shield-check" width={12} />
        Escritura
      </div>
    );
  }

  return (
    <select
      value={display}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AccessLevel)}
      className={`
        text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[#FFB800]/40
        transition-colors duration-150
        ${bgClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
      `}
    >
      {ACCESS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────

const GestionRolesPage: React.FC = () => {
  usePageTitle('Gestión de Roles', 'Configura qué puede ver o editar cada rol en el sistema.', 'lucide:users');
  const { isAdmin, isLoading: permLoading, refreshPermissions, allPermissions } = usePermission();

  const [localPermissions, setLocalPermissions] = React.useState<RolePermission[]>([]);
  const [isSaving,         setIsSaving]         = React.useState(false);
  const [isLoading,        setIsLoading]         = React.useState(false);
  const [message,          setMessage]           = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errorState,       setErrorState]        = React.useState<{ is403: boolean; message: string } | null>(null);

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

  const handlePermissionChange = (roleIndex: number, moduleKey: ModuleKey, newValue: AccessLevel) => {
    setLocalPermissions((prev) => {
      const updated = [...prev];
      updated[roleIndex] = {
        ...updated[roleIndex],
        permissions: {
          ...updated[roleIndex].permissions,
          [moduleKey]: newValue,
        },
      };
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
              isDisabled={isSaving}
              size="sm"
            >
              Recargar
            </Button>
            <Button
              style={{ backgroundColor: '#FFB800', color: '#1A1A1A' }}
              startContent={!isSaving && <Icon icon="lucide:save" width={16} />}
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={isLoading || !!errorState}
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

        {/* ── Matriz de permisos ── */}
        <Card className="shadow-sm">
          <CardHeader className="px-6 py-4 border-b border-divider">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:grid" width={16} className="text-[#FFB800]" />
              <span className="font-semibold text-sm">
                Módulos ({MODULE_ORDER.length}) × Roles ({localPermissions.length})
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
                    MODULE_ORDER.map((moduleKey) => {
                      const label = MODULE_LABELS[moduleKey];
                      const icon  = MODULE_ICONS[moduleKey];

                      return (
                        <tr key={moduleKey} className="hover:bg-default-50/50 dark:hover:bg-default-100/5 transition-colors">
                          {/* Columna fija: nombre del módulo */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-content1 px-5 py-3 border-r border-divider">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#FFB800]/10 flex items-center justify-center shrink-0">
                                <Icon icon={icon} width={14} className="text-[#FFB800]" />
                              </div>
                              <span className="text-sm font-medium text-default-800 dark:text-default-200 whitespace-nowrap">
                                {label}
                              </span>
                            </div>
                          </td>

                          {/* Celdas: selector por rol (sin Administrador) */}
                          {localPermissions.map((rp, roleIdx) => {
                            const currentAccess = rp.permissions[moduleKey] ?? 'none';

                            return (
                              <td
                                key={`${rp.role}-${moduleKey}`}
                                className="px-4 py-3 text-center"
                              >
                                <AccessSelector
                                  value={currentAccess}
                                  locked={false}
                                  disabled={isSaving}
                                  onChange={(v) => handlePermissionChange(roleIdx, moduleKey, v)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* ── Nota informativa ── */}
        <div className="flex items-start gap-2 text-xs text-default-400 bg-default-50 dark:bg-default-100/5 rounded-xl p-3 border border-divider">
          <Icon icon="lucide:info" width={14} className="shrink-0 mt-0.5 text-[#FFB800]" />
          <p>
            Los cambios se aplican a todos los usuarios de ese rol inmediatamente después de guardar.
            El Administrador siempre mantiene acceso total y no puede ser restringido.
          </p>
        </div>

      </motion.div>
    </div>
  );
};

export default GestionRolesPage;
