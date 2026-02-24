/**
 * COMPONENTE: Tarjeta de Estadísticas
 * Componente reutilizable para mostrar estadísticas en el dashboard
 */

import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'default';
  onClick?: () => void;
  description?: string;
}

const iconWrapperClasses: Record<StatsCardProps['color'], string> = {
  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary',
  success: 'bg-success-100 dark:bg-success-900/30 text-success',
  warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning',
  danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger',
  default: 'bg-default-100 dark:bg-default-900/30 text-default-600 dark:text-default-300',
};

const valueColorClasses: Record<StatsCardProps['color'], string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  default: 'text-default-700 dark:text-default-300',
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  onClick,
  description,
}) => {
  const borderColors: Record<StatsCardProps['color'], string> = {
    primary: 'border-primary',
    success: 'border-success',
    warning: 'border-warning',
    danger: 'border-danger',
    default: 'border-default-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full w-full"
    >
      <Card
        className={`shadow-sm h-full w-full flex flex-col border-l-4 ${borderColors[color]} bg-white dark:bg-content1 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        isPressable={!!onClick}
        onPress={onClick}
      >
        <CardBody className="p-4 flex flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-default-500 uppercase tracking-wide">{title}</p>
            <p className={`text-3xl font-bold text-secondary mt-1`}>{value}</p>
            {description && (
              <p className="text-xs text-default-400 mt-1">{description}</p>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconWrapperClasses[color]}`}
          >
            <Icon icon={icon} className="text-2xl" />
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

