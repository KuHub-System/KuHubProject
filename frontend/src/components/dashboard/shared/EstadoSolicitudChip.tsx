/**
 * COMPONENTE: Chip de Estado de Solicitud
 * Componente reutilizable para mostrar el estado de una solicitud
 */

import React from 'react';
import { Chip } from '@heroui/react';

interface EstadoSolicitudChipProps {
  estado: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const EstadoSolicitudChip: React.FC<EstadoSolicitudChipProps> = ({ 
  estado, 
  size = 'sm' 
}) => {
  if (!estado) {
    return <Chip size={size} variant="flat">Sin solicitud</Chip>;
  }
  
  switch (estado) {
    case 'Pendiente':
      return <Chip color="warning" size={size}>{estado}</Chip>;
    case 'Aceptada':
      return <Chip color="success" size={size}>{estado}</Chip>;
    case 'Rechazada':
      return <Chip color="danger" size={size}>{estado}</Chip>;
    default:
      return <Chip size={size}>{estado}</Chip>;
  }
};

