import React from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import { Button, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { motion } from 'framer-motion';

const LOGO_URL = new URL('./assets/KuHubLogoWBG.png', import.meta.url).href;

/**
 * Interfaz para las propiedades del componente Sidebar.
 */
interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

/**
 * 🔥 INTERFAZ ACTUALIZADA: Ahora usa pageId en lugar de roles
 * pageId coincide con el ID de permiso en el sistema de roles
 */
interface MenuItem {
  title: string;
  path: string;
  icon: string;
  pageId: string; // ID del permiso (ej: 'dashboard', 'inventario')
}

/**
 * Componente de barra lateral (Sidebar) con permisos dinámicos.
 * Ahora los menús se muestran según los permisos actuales del rol del usuario.
 * 
 * @param {SidebarProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente Sidebar.
 */
const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  // 🔥 Ahora usamos canAccessPage para verificar permisos dinámicos
  const { user, canAccessPage, logout } = useAuth();
  const location = useLocation();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  /**
   * 🔥 LISTA ACTUALIZADA: Ahora incluye Gestión de Usuarios y Gestión de Solicitudes
   * Los permisos se verifican dinámicamente contra la configuración actual
   */
  /**
   * Estructura de categorías del menú
   */
  interface MenuCategory {
    title: string;
    items: MenuItem[];
  }

  const menuCategories: MenuCategory[] = [
    {
      title: 'General',
      items: [
        { title: 'Dashboard', path: '/dashboard', icon: 'lucide:layout-dashboard', pageId: 'dashboard' },
        { title: 'Solicitud', path: '/solicitud', icon: 'lucide:clipboard-list', pageId: 'solicitud' }
      ]
    },
    {
      title: 'Administración',
      items: [
        { title: 'Gestión de Pedidos', path: '/gestion-pedidos', icon: 'lucide:shopping-cart', pageId: 'gestion-pedidos' },
        { title: 'Conglomerado de Pedidos', path: '/conglomerado-pedidos', icon: 'lucide:layers', pageId: 'conglomerado-pedidos' },
        { title: 'Gestión de Recetas', path: '/gestion-recetas', icon: 'lucide:book-open', pageId: 'gestion-recetas' },
        { title: 'Gestión de Asignaturas', path: '/ramos-admin', icon: 'lucide:graduation-cap', pageId: 'ramos-admin' },
        { title: 'Gestión de Solicitudes', path: '/gestion-solicitudes', icon: 'lucide:clipboard-check', pageId: 'gestion-solicitudes' },
        { title: 'Administración del Sistema', path: '/admin-sistema', icon: 'lucide:settings-2', pageId: 'admin-sistema' }
      ]
    },
    {
      title: 'Inventario',
      items: [
        { title: 'Inventario', path: '/inventario', icon: 'lucide:package', pageId: 'inventario' },
        { title: 'Historial / Movimientos ', path: '/movimientos', icon: 'lucide:history', pageId: 'inventario' },
        { title: 'Bodega de Tránsito', path: '/bodega-transito', icon: 'lucide:warehouse', pageId: 'bodega-transito' },
        { title: 'Gestión de Proveedores', path: '/gestion-proveedores', icon: 'lucide:truck', pageId: 'gestion-proveedores' }
      ]
    },
    {
      title: 'Usuarios',
      items: [
        { title: 'Gestión de Roles', path: '/gestion-roles', icon: 'lucide:users', pageId: 'gestion-roles' },
        { title: 'Gestión de Usuarios', path: '/gestion-usuarios', icon: 'lucide:user-cog', pageId: 'gestion-usuarios' }
      ]
    }
  ];

  /**
   * Filtra las categorías y sus items según permisos
   */
  const filteredCategories = menuCategories.map(category => ({
    ...category,
    items: category.items.filter(item => {
      if (!user) return false;
      return canAccessPage(item.pageId);
    })
  })).filter(category => category.items.length > 0);

  // Estado para controlar qué categorías están colapsadas
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});

  const toggleCategory = (title: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Variantes para las animaciones con Framer Motion (existentes)
  const sidebarVariants = {
    open: { width: '280px', transition: { duration: 0.3, ease: "easeInOut" } },
    closed: { width: '80px', transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const textVariants = {
    open: { opacity: 1, display: 'block', transition: { delay: 0.1 } },
    closed: { opacity: 0, display: 'none', transition: { duration: 0.1 } }
  };

  const headerVariants = {
    open: { opacity: 1, display: 'flex', transition: { delay: 0.1 } },
    closed: { opacity: 0, display: 'none', transition: { duration: 0.1 } }
  };

  return (
    <motion.div
      className="sidebar bg-white dark:bg-content1 border-r border-default-200 dark:border-default-100 h-screen z-50 sticky top-0 flex flex-col font-sans"
      variants={sidebarVariants}
      animate={isOpen ? 'open' : 'closed'}
      initial={isOpen ? 'open' : 'closed'}
    >
      <div className="flex flex-col h-full">
        {/* Encabezado del sidebar */}
        <div className="p-5 flex items-center justify-between border-b border-default-100 dark:border-default-50">
          <div className="flex items-center">
            {/* Logo de KüHub */}
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-sm">
              <img src={LOGO_URL} alt="Logo KüHub" />
            </div>
            <motion.div
              className="ml-3 flex flex-col justify-center"
              variants={headerVariants}
              animate={isOpen ? 'open' : 'closed'}
              initial={isOpen ? 'open' : 'closed'}
            >
              <span className="text-xl font-bold text-secondary dark:text-foreground leading-none tracking-tight">KüHub</span>
              <span className="text-[10px] font-semibold text-default-400 uppercase tracking-widest mt-0.5">Sistema de Gestión</span>
            </motion.div>
          </div>
          {isOpen && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              aria-label="Toggle Sidebar"
              onPress={toggleSidebar}
              className="text-default-400 hover:text-secondary dark:hover:text-foreground hover:bg-default-100 dark:hover:bg-default-50"
            >
              <Icon icon="lucide:chevron-left" width={20} />
            </Button>
          )}
        </div>

        {/* Elementos del menú */}
        <div className="flex-grow overflow-y-auto py-4 px-3 scrollbar-hide space-y-4">
          {/* Botón flotante para abrir el sidebar si está cerrado */}
          {!isOpen && (
            <div className="flex justify-center mb-4">
              <Button isIconOnly variant="light" onPress={toggleSidebar}>
                <Icon icon="lucide:menu" className="text-default-500" width={24} />
              </Button>
            </div>
          )}

          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, index) => {
              const isCollapsed = collapsedCategories[category.title];

              return (
                <div key={category.title}>
                  {/* Título de Categoría (Clickable solo si está abierto el sidebar) */}
                  <motion.div
                    className={`px-3 flex items-center justify-between mb-2 group ${isOpen ? 'cursor-pointer' : ''}`}
                    variants={headerVariants}
                    animate={isOpen ? 'open' : 'closed'}
                    initial={isOpen ? 'open' : 'closed'}
                    onClick={() => isOpen && toggleCategory(category.title)}
                  >
                    <span className="text-[11px] font-bold text-default-400 uppercase tracking-wider group-hover:text-primary transition-colors">
                      {category.title}
                    </span>
                    {isOpen && (
                      <Icon
                        icon="lucide:chevron-down"
                        className={`text-default-300 text-xs transition-transform duration-200 group-hover:text-primary ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                      />
                    )}
                  </motion.div>

                  {/* Separador visual para modo cerrado si no es el primero */}
                  {!isOpen && index > 0 && <div className="h-px bg-default-100 mx-2 my-2" />}

                  {/* Lista de Items (Colapsable) */}
                  <motion.div
                    initial="expanded"
                    animate={isCollapsed && isOpen ? "collapsed" : "expanded"}
                    variants={{
                      expanded: { height: 'auto', opacity: 1, overflow: 'hidden' },
                      collapsed: { height: 0, opacity: 0, overflow: 'hidden' }
                    }}
                    transition={{ duration: 0.2 }}
                    className="space-y-0.5"
                  >
                    {category.items.map((item) => {
                      const isActive = location.pathname.startsWith(item.path); // Usa startsWith para subrutas

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`
                             group flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 outline-none
                             ${isActive
                              ? 'bg-primary text-secondary shadow-md shadow-primary/20 font-semibold'
                              : 'text-default-600 dark:text-default-400 hover:bg-default-100 dark:hover:bg-default-50 hover:text-secondary dark:hover:text-foreground'
                            }
                          `}
                          title={!isOpen ? item.title : undefined}
                        >
                          <Icon
                            icon={item.icon}
                            width={20}
                            className={`flex-shrink-0 transition-colors ${isActive ? 'text-secondary' : 'text-default-400 group-hover:text-secondary dark:group-hover:text-foreground'}`}
                          />
                          <motion.span
                            className="ml-3 text-sm whitespace-nowrap"
                            variants={textVariants}
                            animate={isOpen ? 'open' : 'closed'}
                            initial={isOpen ? 'open' : 'closed'}
                          >
                            {item.title}
                          </motion.span>

                          {/* Indicador activo (punto) opcional */}
                          {isActive && isOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary block" />}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-default-400 text-sm">
              <Icon icon="lucide:lock" className="text-3xl mx-auto mb-2 opacity-50" />
              <motion.p
                variants={textVariants}
                animate={isOpen ? 'open' : 'closed'}
                initial={isOpen ? 'open' : 'closed'}
              >
                Sin permisos asignados
              </motion.p>
            </div>
          )}
        </div>

        {/* Pie del sidebar */}
        <div className="p-4 bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 rounded-lg transition-colors text-default-500 hover:bg-red-50 dark:hover:bg-danger-50 hover:text-red-600 dark:hover:text-danger-500 group"
          >
            <Icon icon="lucide:log-out" width={20} className="group-hover:stroke-current" />
            <motion.span
              className="ml-3 text-sm font-medium"
              variants={textVariants}
              animate={isOpen ? 'open' : 'closed'}
              initial={isOpen ? 'open' : 'closed'}
            >
              Cerrar sesión
            </motion.span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;