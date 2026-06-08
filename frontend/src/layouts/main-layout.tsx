import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import Header from '../components/header';
import Sidebar from '../components/sidebar';
import { useAuth } from '../contexts/auth-context';

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
  const { logout } = useAuth();
  const history = useHistory();

  // Estado para controlar si el sidebar está abierto o cerrado
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogoutStart = () => {
    setIsLoggingOut(true);
  };

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
      width: 'calc(100% - 280px)',
      transition: { duration: 0.3 }
    },
    sidebarClosed: {
      marginLeft: '80px',
      width: 'calc(100% - 80px)',
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="main-container">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} onLogout={handleLogoutStart} />

      {/* Contenido principal */}
      <motion.div
        className="content-container"
        variants={contentVariants}
        animate={isSidebarOpen ? 'sidebarOpen' : 'sidebarClosed'}
        initial={isSidebarOpen ? 'sidebarOpen' : 'sidebarClosed'}
      >
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} onLogout={handleLogoutStart} />

        {/* Contenido de la página */}
        <main className="py-6">
          {children}
        </main>
      </motion.div>
      {/* ── Animación de transición al cerrar sesión ── */}
      <AnimatePresence>
        {isLoggingOut && (
          <>
            {/* 1. Barrido dorado desde esquina superior derecha expandiéndose hacia abajo-izquierda */}
            <motion.div
              initial={{ clipPath: 'polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)' }}
              animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'linear-gradient(135deg, #FFB800 0%, #e09500 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* 2. Logo KuHub aparece en el centro con pop elástico */}
            <motion.div
              initial={{ opacity: 0, scale: 0.4, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1.1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
              style={{
                position: 'fixed', top: '48%', left: '50%',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            >
              <img
                src="/nrelogoo-Photoroom.png"
                alt="KuHub"
                style={{ width: 220, height: 220, objectFit: 'contain' }}
              />
            </motion.div>

            {/* 3. Fade a blanco → limpia auth y redirige */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 1.1 }}
              onAnimationComplete={() => {
                logout();
                history.push('/login');
              }}
              style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: '#fff',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
