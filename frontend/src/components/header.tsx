import React from 'react';
import { Avatar, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { useThemeContext } from '../contexts/theme-context';
import { useHistory } from 'react-router-dom';
import logo from './assets/KüHubLogoWBG.png';

/**
 * Interfaz para las propiedades del componente Header.
 */
interface HeaderProps {
  toggleSidebar: () => void;
}

/**
 * Componente de encabezado (Header) que muestra información del usuario y controles de navegación.
 * 
 * @param {HeaderProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente Header.
 */
const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const history = useHistory();

  /**
   * Maneja el cierre de sesión.
   */
  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  /**
   * Navega al perfil del usuario.
   */
  const goToProfile = () => {
    history.push('/perfil');
  };

  return (
    <header className="header w-full py-2 px-4">
      <div className="flex items-center justify-between">
        {/* Botón para mostrar/ocultar sidebar en móviles */}
        <Button
          isIconOnly
          variant="light"
          className="md:hidden"
          aria-label="Toggle Sidebar"
          onPress={toggleSidebar}
        >
            <DropdownItem key="profile" onPress={goToProfile}>
                <div className="flex items-center gap-2">
                    {/* Cambia el icono por el logo */}
                    <img src={logo} alt="Logo KuHub" className="h-5 w-5 rounded" />
                    <span>Perfil</span>
                </div>
            </DropdownItem>
        </Button>

        {/* Título de la página (visible solo en móviles) */}
        <h1 className="text-lg font-semibold md:hidden">KuHub</h1>

        {/* Espacio vacío para alinear a la derecha en desktop */}
        <div className="hidden md:block"></div>

        {/* Controles de la derecha */}
        <div className="flex items-center gap-2">
          {/* Botón de cambio de tema */}
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

          {/* Dropdown del usuario */}
          {user && (
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="light"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar
                    name={user.nombre}
                    size="sm"
                    src={user.avatar || undefined}
                  />
                  <span className="hidden md:inline text-sm font-medium">
                    {user.nombre}
                  </span>
                  <Icon icon="lucide:chevron-down" className="text-sm" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Acciones de usuario">
                <DropdownItem key="profile" onPress={goToProfile}>
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:user" />
                    <span>Perfil</span>
                  </div>
                </DropdownItem>
                <DropdownItem key="role" isReadOnly>
                  <div className="flex items-center gap-2 text-default-500">
                    <Icon icon="lucide:shield" />
                    <span>Rol: {user.rol}</span>
                  </div>
                </DropdownItem>
                <DropdownItem key="logout" className="text-danger" color="danger" onPress={handleLogout}>
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:log-out" />
                    <span>Cerrar sesión</span>
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
