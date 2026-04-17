import React from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@heroui/react';
import { useThemeContext } from '../contexts/theme-context';

/**
 * Interfaz para las propiedades del componente AuthLayout.
 */
interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout para las páginas de autenticación.
 * Proporciona un diseño centrado con el logo y un botón para cambiar el tema.
 * 
 * @param {AuthLayoutProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente AuthLayout.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: 'url(/bg-cousino-960x600.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Botón de cambio de tema */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          isIconOnly
          variant="light"
          aria-label="Toggle Theme"
          onPress={toggleTheme}
        >
          <Icon
            icon={theme === 'light' ? 'lucide:moon' : 'lucide:sun'}
            className="text-lg"
          />
        </Button>
      </div>

      {/* Overlay sobre el fondo */}
      <div className="absolute inset-0 bg-white/75 dark:bg-black/90" />

      {/* Contenido centrado */}
      <div className="relative z-10 flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">


          {/* Contenido de autenticación */}
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-sm text-default-500">
        <p>© {new Date().getFullYear()} KuHub · Entorno de Pruebas | v1.0.10</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
