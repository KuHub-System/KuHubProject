import React from 'react';
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Página de error 404 (No encontrado).
 * Se muestra cuando el usuario accede a una ruta que no existe.
 * 
 * @returns {JSX.Element} La página de error 404.
 */
const NotFoundPage: React.FC = () => {
  const history = useHistory();

  /**
   * Navega al dashboard.
   */
  const goToDashboard = () => {
    history.push('/dashboard');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center text-center"
      >
        <div className="w-24 h-24 bg-default-100 rounded-full flex items-center justify-center mb-6">
          <Icon icon="lucide:alert-triangle" className="text-4xl text-warning" />
        </div>
        
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Página no encontrada</h2>
        
        <p className="text-default-500 max-w-md mb-8">
          Lo sentimos, la página que está buscando no existe o no tiene permisos para acceder a ella.
        </p>
        
        <Button 
          color="primary" 
          startContent={<Icon icon="lucide:home" />}
          onPress={goToDashboard}
        >
          Volver al Dashboard
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
