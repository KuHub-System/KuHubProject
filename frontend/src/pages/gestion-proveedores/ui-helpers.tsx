/**
 * Helpers de UI (chips de estado) compartidos de Gestión de Proveedores.
 * Extraído de gestion-proveedores.tsx sin cambios de lógica.
 */

import { Chip } from '@heroui/react';
import type { EstadoProveedor } from '../../types/proveedor/proveedor.types';

export const renderEstado = (estado: EstadoProveedor) => {
  return estado === 'DISPONIBLE'
    ? <Chip color="success" size="sm" variant="flat">Disponible</Chip>
    : <Chip color="danger" size="sm" variant="flat">No Disponible</Chip>;
};

export const renderDisponibilidad = (activo: boolean) => {
  return activo
    ? <Chip color="success" size="sm" variant="flat">Activo</Chip>
    : <Chip color="warning" size="sm" variant="flat">Desabilitado</Chip>;
};
