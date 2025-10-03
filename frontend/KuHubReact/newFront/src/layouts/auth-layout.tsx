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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Botón de cambio de tema */}
      <div className="absolute top-4 right-4">
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

      {/* Contenido centrado */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-primary flex items-center justify-center rounded-lg shadow-md">
              <Icon icon="lucide:utensils" className="text-white text-3xl" />
            </div>
          </div>

          {/* Contenido de autenticación */}
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-default-500">
        <p>© 2025 KuHub System | Version 0.1</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
