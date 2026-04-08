import React from 'react';
import { Avatar, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { useThemeContext } from '../contexts/theme-context';
import { useHistory } from 'react-router-dom';
import { usePageTitleContext } from '../contexts/PageTitleContext';

const LOGO_URL = new URL('./assets/KuHubLogoWBG.png', import.meta.url).href;

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
  const { title, subtitle, icon } = usePageTitleContext();
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
    <header className="header w-full py-3 px-6 bg-white dark:bg-content1 border-b border-default-200 dark:border-default-100 sticky top-0 z-40 transition-colors duration-200">
      <div className="flex items-center justify-between">
        {/* Botón para mostrar/ocultar sidebar en móviles */}
        <Button
          isIconOnly
          variant="light"
          className="md:hidden text-default-600 dark:text-default-400"
          aria-label="Toggle Sidebar"
          onPress={toggleSidebar}
        >
          <Icon icon="lucide:menu" width={24} />
        </Button>

        {/* Título de la página (visible solo en móviles) */}
        <div className="flex items-center gap-2 md:hidden">
          <img src={LOGO_URL} alt="Logo" className="h-6 w-6" />
          <h1 className="text-lg font-bold text-secondary dark:text-foreground">KüHub</h1>
        </div>

        {/* Título dinámico (visible en desktop) */}
        <div className="hidden md:flex flex-col ml-4">
          <h1 className="text-xl font-bold text-secondary dark:text-foreground leading-tight flex items-center gap-2">
            {icon && <Icon icon={icon} width={20} className="text-primary shrink-0" />}
            {title || 'KüHub'}
          </h1>
          {subtitle && <p className="text-xs text-default-500">{subtitle}</p>}
        </div>

        {/* Espacio flexible */}
        <div className="flex-1"></div>

        {/* Controles de la derecha */}
        <div className="flex items-center gap-3">
          {/* Botón de cambio de tema */}
          <Button
            isIconOnly
            variant="light"
            size="sm"
            aria-label="Toggle Theme"
            onPress={toggleTheme}
            className="text-default-500 hover:text-primary transition-colors"
          >
            <Icon
              icon={theme === 'light' ? 'lucide:moon' : 'lucide:sun'}
              width={20}
            />
          </Button>

          <div className="h-6 w-px bg-default-200 mx-1 hidden md:block"></div>

          {/* Dropdown del usuario */}
          {user && (
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  variant="light"
                  className="flex items-center gap-3 px-2 h-auto py-1 data-[hover=true]:bg-default-100 dark:data-[hover=true]:bg-default-50"
                >
                  <div className="flex flex-col items-end hidden md:flex">
                    <span className="text-sm font-bold text-secondary dark:text-foreground leading-none">{user.nombre}</span>
                    <span className="text-[10px] text-default-500 font-medium uppercase mt-0.5">{user.rol}</span>
                  </div>
                  <Avatar
                    name={user.nombre}
                    size="sm"
                    src={user.fotoPerfil || undefined}
                    className="w-8 h-8 text-tiny font-bold bg-primary text-secondary ring-2 ring-white dark:ring-default-100"
                  />
                  <Icon icon="lucide:chevron-down" className="text-default-400 text-xs" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Acciones de usuario" className="w-56">
                <DropdownItem key="profile" onPress={goToProfile} className="gap-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:user" width={16} />
                    <span className="font-medium">Mi Perfil</span>
                  </div>
                </DropdownItem>
                <DropdownItem key="settings" showDivider className="gap-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:settings" width={16} />
                    <span className="font-medium">Configuración</span>
                  </div>
                </DropdownItem>
                <DropdownItem key="logout" className="text-danger color-danger" onPress={handleLogout}>
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:log-out" width={16} />
                    <span className="font-medium">Cerrar Sesión</span>
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
