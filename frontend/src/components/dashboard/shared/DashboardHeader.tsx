/**
 * COMPONENTE: Encabezado del Dashboard
 * Encabezado reutilizable para todos los tipos de dashboard
 */

import React from 'react';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  userName: string;
  subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  subtitle
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="pb-6 border-b border-default-100 mb-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 bg-primary rounded-full"></div>
        <div>
          <h1 className="text-2xl font-bold text-secondary dark:text-foreground leading-tight">Dashboard</h1>
          <p className="text-default-500 text-sm">
            {subtitle || `Bienvenido, `}
            <span className="font-semibold text-secondary dark:text-foreground">{userName}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

