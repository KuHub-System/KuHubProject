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
    >
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-default-500">
        {subtitle || `Bienvenido, `}
        <span className="font-medium">{userName}</span>
      </p>
    </motion.div>
  );
};

