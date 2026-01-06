import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  const { user, canAccessPage } = useAuth();
  const location = useLocation();

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
        { title: 'Gestión de Solicitudes', path: '/gestion-solicitudes', icon: 'lucide:clipboard-check', pageId: 'gestion-solicitudes' }
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
    open: { width: '280px', transition: { duration: 0.3 } },
    closed: { width: '80px', transition: { duration: 0.3 } }
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
      className="sidebar bg-content1 shadow-md overflow-hidden h-screen z-50 sticky top-0"
      variants={sidebarVariants}
      animate={isOpen ? 'open' : 'closed'}
      initial={isOpen ? 'open' : 'closed'}
    >
      <div className="flex flex-col h-full">
        {/* Encabezado del sidebar */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* Logo de KüHub */}
            <div className="w-10 h-10 bg-content2 dark:bg-zinc-900 flex items-center justify-center rounded-md">
              <img src={LOGO_URL} alt="Logo KüHub" className="h-8 w-8 object-contain" />
            </div>
            <motion.span
              className="text-xl font-bold ml-3 text-primary"
              variants={textVariants}
              animate={isOpen ? 'open' : 'closed'}
              initial={isOpen ? 'open' : 'closed'}
            >
              KüHub
            </motion.span>
          </div>
          <Button
            isIconOnly
            variant="light"
            aria-label="Toggle Sidebar"
            onPress={toggleSidebar}
          >
            <Icon icon={isOpen ? "lucide:chevron-left" : "lucide:chevron-right"} className="text-lg" />
          </Button>
        </div>

        <Divider />

        {/* Elementos del menú */}
        <div className="flex-grow overflow-y-auto py-2 scrollbar-hidden">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, index) => {
              const isCollapsed = collapsedCategories[category.title];

              return (
                <div key={category.title} className="mb-2">
                  {/* Título de Categoría (Clickable solo si está abierto el sidebar) */}
                  <motion.div
                    className={`px-4 py-2 flex items-center gap-2 ${isOpen ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                    variants={headerVariants}
                    animate={isOpen ? 'open' : 'closed'}
                    initial={isOpen ? 'open' : 'closed'}
                    onClick={() => isOpen && toggleCategory(category.title)}
                  >
                    <span className="text-xs font-bold text-default-500 uppercase tracking-wider">
                      {category.title}
                    </span>
                    {isOpen && (
                      <Icon
                        icon="lucide:chevron-down"
                        className={`text-default-400 text-sm transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                      />
                    )}
                  </motion.div>

                  {/* Separador visual para modo cerrado si no es el primero */}
                  {!isOpen && index > 0 && <Divider className="my-2 mx-2 w-auto" />}

                  {/* Lista de Items (Colapsable) */}
                  <motion.div
                    initial="expanded"
                    animate={isCollapsed && isOpen ? "collapsed" : "expanded"}
                    variants={{
                      expanded: { height: 'auto', opacity: 1, overflow: 'hidden' },
                      collapsed: { height: 0, opacity: 0, overflow: 'hidden' }
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {category.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-4 py-3 my-1 mx-2 rounded-md transition-all-200 ${location.pathname === item.path
                          ? 'bg-primary-100 text-primary'
                          : 'text-foreground hover:bg-default-100'
                          }`}
                        title={!isOpen ? item.title : undefined}
                      >
                        <Icon icon={item.icon} className="text-xl flex-shrink-0" />
                        <motion.span
                          className="ml-3 text-sm font-medium whitespace-nowrap"
                          variants={textVariants}
                          animate={isOpen ? 'open' : 'closed'}
                          initial={isOpen ? 'open' : 'closed'}
                        >
                          {item.title}
                        </motion.span>
                      </NavLink>
                    ))}
                  </motion.div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-default-400 text-sm">
              <Icon icon="lucide:lock" className="text-3xl mx-auto mb-2" />
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

        <Divider />

        {/* Pie del sidebar */}
        <div className="p-4">
          <NavLink
            to="/perfil"
            className={`flex items-center px-4 py-3 rounded-md transition-all-200 ${location.pathname === '/perfil'
              ? 'bg-primary-100 text-primary'
              : 'text-foreground hover:bg-default-100'
              }`}
          >
            <Icon icon="lucide:user" className="text-xl" />
            <motion.span
              className="ml-3 text-sm font-medium"
              variants={textVariants}
              animate={isOpen ? 'open' : 'closed'}
              initial={isOpen ? 'open' : 'closed'}
            >
              Perfil
            </motion.span>
          </NavLink>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;