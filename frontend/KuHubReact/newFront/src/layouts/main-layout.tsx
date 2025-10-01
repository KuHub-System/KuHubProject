import React from 'react';
import { motion } from 'framer-motion';
import Header from '../components/header';
import Sidebar from '../components/sidebar';
import Footer from '../components/footer';

/**
 * Interfaz para las propiedades del componente MainLayout.
 */
interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout principal de la aplicación.
 * Incluye la barra lateral (Sidebar), el encabezado (Header) y el pie de página (Footer).
 * 
 * @param {MainLayoutProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente MainLayout.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Estado para controlar si el sidebar está abierto o cerrado
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  /**
   * Alterna el estado del sidebar entre abierto y cerrado.
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Variantes para las animaciones con Framer Motion
  const contentVariants = {
    sidebarOpen: { 
      marginLeft: '280px',
      transition: { duration: 0.3 }
    },
    sidebarClosed: { 
      marginLeft: '80px',
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="main-container">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Contenido principal */}
      <motion.div
        className="content-container"
        variants={contentVariants}
        animate={isSidebarOpen ? 'sidebarOpen' : 'sidebarClosed'}
        initial={isSidebarOpen ? 'sidebarOpen' : 'sidebarClosed'}
      >
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} />

        {/* Contenido de la página */}
        <main className="py-6">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </motion.div>
    </div>
  );
};

export default MainLayout;
