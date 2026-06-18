import React from 'react';
import { Avatar, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { useThemeContext } from '../contexts/theme-context';
import { useHistory } from 'react-router-dom';
import { usePageTitleContext } from '../contexts/PageTitleContext';
import { usePeriodoSemana } from '../contexts/periodo-semana-context';
import { useSistemaConfig } from '../contexts/sistema-config-context';
import { obtenerResumenNotificaciones, INotificacionSemana, INotificacionEntrega } from '../services/notification-service';
import SoporteModal from './modals/SoporteModal';

const LOGO_URL = new URL('./assets/KuHubLogoWBG.png', import.meta.url).href;

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout?: () => void;
}

const POLL_MS = 60_000;

/** Clave en sessionStorage que indica que el usuario ya abrió el panel de soporte en esta sesión. */
const SOPORTE_VISTO_KEY = 'kuhub_soporte_visto';

const Header: React.FC<HeaderProps> = ({ toggleSidebar, onLogout }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const { title, subtitle, icon } = usePageTitleContext();
  const history = useHistory();
  const { periodo, seleccionarPeriodo, seleccionarSemana } = usePeriodoSemana();
  const { solicitudesEnPedido } = useSistemaConfig();

  const [notificaciones, setNotificaciones] = React.useState<INotificacionSemana[]>([]);
  const [notificacionesAceptadas, setNotificacionesAceptadas] = React.useState<INotificacionSemana[]>([]);
  const [notificacionesPedidosPendientes, setNotificacionesPedidosPendientes] = React.useState<INotificacionSemana[]>([]);
  const [notificacionesSinOp, setNotificacionesSinOp] = React.useState<INotificacionSemana[]>([]);
  const [notificacionesEntregas, setNotificacionesEntregas] = React.useState<INotificacionEntrega[]>([]);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Soporte: el badge "1" se muestra en cada inicio de sesión hasta que el usuario abra el modal.
  const [soporteOpen, setSoporteOpen] = React.useState(false);
  const [soporteVisto, setSoporteVisto] = React.useState<boolean>(
    () => sessionStorage.getItem(SOPORTE_VISTO_KEY) === '1'
  );

  const handleAbrirSoporte = () => {
    setSoporteOpen(true);
    setSoporteVisto(true);
    sessionStorage.setItem(SOPORTE_VISTO_KEY, '1');
  };

  const totalPendientes = notificaciones.reduce((acc, n) => acc + n.cantidadPendientes, 0);
  const totalAceptadasSinConsolidar = !solicitudesEnPedido
    ? notificacionesAceptadas.reduce((acc, n) => acc + n.cantidadPendientes, 0)
    : 0;
  const totalPedidosPendientes = notificacionesPedidosPendientes.reduce((acc, n) => acc + n.cantidadPendientes, 0);
  const totalSinOp = notificacionesSinOp.reduce((acc, n) => acc + n.cantidadPendientes, 0);
  const totalEntregas = notificacionesEntregas.length;
  const totalBadge = totalPendientes + totalAceptadasSinConsolidar + totalPedidosPendientes + totalSinOp + totalEntregas;

  const fechaHoy = React.useMemo(() => {
    const hoy = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  }, []);

  // Cerrar panel al hacer click fuera
  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [panelOpen]);

  // Polling — única consulta al backend
  React.useEffect(() => {
    const poll = async () => {
      try {
        const resumen = await obtenerResumenNotificaciones();
        setNotificaciones(resumen.solicitudesPendientes);
        setNotificacionesAceptadas(resumen.solicitudesAceptadas);
        setNotificacionesPedidosPendientes(resumen.pedidosPendientes);
        setNotificacionesSinOp(resumen.pedidosSinOp);
        setNotificacionesEntregas(resumen.entregasHoyAyer);
      } catch {
        // Falla silenciosa: el usuario puede no tener conexión o el backend no estar disponible
      }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
      history.push('/login');
    }
  };

  const goToProfile = () => history.push('/perfil');

  const handleIr = async (item: INotificacionSemana) => {
    setPanelOpen(false);
    if (!periodo || periodo.anio !== item.anio || periodo.semestre !== item.semestre) {
      await seleccionarPeriodo(item.anio, item.semestre);
    }
    seleccionarSemana(String(item.idSemana));
    history.push('/gestion-solicitudes');
  };

  const handleIrPedidos = async (item: INotificacionSemana) => {
    setPanelOpen(false);
    if (!periodo || periodo.anio !== item.anio || periodo.semestre !== item.semestre) {
      await seleccionarPeriodo(item.anio, item.semestre);
    }
    seleccionarSemana(String(item.idSemana));
    history.push('/gestion-pedidos');
  };

  const handleIrConglomerado = async (item: INotificacionSemana) => {
    setPanelOpen(false);
    if (!periodo || periodo.anio !== item.anio || periodo.semestre !== item.semestre) {
      await seleccionarPeriodo(item.anio, item.semestre);
    }
    seleccionarSemana(String(item.idSemana));
    history.push('/conglomerado-pedidos');
  };

  const handleIrProveedores = async (item: INotificacionSemana) => {
    setPanelOpen(false);
    if (!periodo || periodo.anio !== item.anio || periodo.semestre !== item.semestre) {
      await seleccionarPeriodo(item.anio, item.semestre);
    }
    seleccionarSemana(String(item.idSemana));
    history.push(`/gestion-proveedores?abrirOP=1&anio=${item.anio}&semestre=${item.semestre}&semanaId=${item.idSemana}`);
  };

  return (
    <header className="header w-full py-3 px-6 bg-white dark:bg-content1 border-b border-default-200 dark:border-default-100 sticky top-0 z-40 transition-colors duration-200">
      <div className="flex items-center justify-between">

        {/* Botón sidebar móvil */}
        <Button
          isIconOnly
          variant="light"
          className="md:hidden text-default-600 dark:text-default-400"
          aria-label="Toggle Sidebar"
          onPress={toggleSidebar}
        >
          <Icon icon="lucide:menu" width={24} />
        </Button>

        {/* Título móvil */}
        <div className="flex items-center gap-2 md:hidden">
          <img src={LOGO_URL} alt="Logo" className="h-6 w-6" />
          <h1 className="text-lg font-bold text-secondary dark:text-foreground">KüHub</h1>
        </div>

        {/* Título dinámico desktop */}
        <div className="hidden md:flex flex-col ml-4">
          <h1 className="text-xl font-bold text-secondary dark:text-foreground leading-tight flex items-center gap-2">
            {icon && <Icon icon={icon} width={20} className="text-primary shrink-0" />}
            {title || 'KüHub'}
          </h1>
          {subtitle && <p className="text-xs text-default-500">{subtitle}</p>}
        </div>

        <div className="flex-1" />

        {/* Controles derecha */}
        <div className="flex items-center gap-3">

          {/* Panel de notificaciones */}
          <div className="relative" ref={panelRef}>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              aria-label="Notificaciones"
              className="text-default-500 hover:text-primary transition-colors"
              onPress={() => setPanelOpen(v => !v)}
            >
              <Icon icon={totalBadge > 0 ? 'lucide:bell-ring' : 'lucide:bell'} width={20} />
            </Button>

            {totalBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}

            {panelOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-content1 border border-default-200 dark:border-default-100 rounded-xl shadow-lg z-50 overflow-hidden">

                {/* Header del panel */}
                <div className="px-4 py-3 border-b border-default-100 dark:border-default-100/50 flex items-center gap-2">
                  <Icon icon="lucide:bell" width={15} className="text-primary shrink-0" />
                  <span className="text-sm font-bold text-secondary dark:text-foreground">
                    Notificaciones
                  </span>
                  {totalBadge > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {totalBadge}
                    </span>
                  )}
                </div>

                {/* Sección: Solicitudes Pendientes */}
                <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
                  <Icon icon="lucide:clock" width={12} className="text-warning shrink-0" />
                  <span className="text-[10px] font-bold text-warning uppercase tracking-wider">
                    Solicitudes Pendientes
                  </span>
                  {totalPendientes > 0 && (
                    <span className="ml-auto min-w-[18px] h-4 px-1 bg-warning/20 text-warning text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {totalPendientes}
                    </span>
                  )}
                </div>

                {notificaciones.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-2 mb-1 text-default-400">
                    <Icon icon="lucide:check-circle" width={14} />
                    <span className="text-xs">Sin solicitudes pendientes</span>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-default-100 dark:divide-default-100/30 max-h-48 overflow-y-auto">
                    {notificaciones.map(item => (
                      <button
                        key={item.idSemana}
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors cursor-pointer group"
                        onClick={() => handleIr(item)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-secondary dark:text-foreground leading-none">
                            {item.nombreSemana}
                          </span>
                          <span className="text-[11px] text-warning-600 dark:text-warning font-medium">
                            {item.cantidadPendientes} Pendiente{item.cantidadPendientes !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Icon icon="lucide:arrow-right" width={14} className="text-default-300 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Sección: Solicitudes por Consolidar (solo cuando solicitudesEnPedido = false) */}
                {!solicitudesEnPedido && (
                  <>
                    <div className="border-t border-default-100 dark:border-default-100/50 mx-0" />
                    <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
                      <Icon icon="lucide:shopping-cart" width={12} className="text-primary shrink-0" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        Por Consolidar
                      </span>
                      {totalAceptadasSinConsolidar > 0 && (
                        <span className="ml-auto min-w-[18px] h-4 px-1 bg-primary/20 text-primary text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                          {totalAceptadasSinConsolidar}
                        </span>
                      )}
                    </div>

                    {notificacionesAceptadas.length === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-2 mb-2 text-default-400">
                        <Icon icon="lucide:check-circle" width={14} />
                        <span className="text-xs">Todo consolidado</span>
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-default-100 dark:divide-default-100/30 max-h-48 overflow-y-auto mb-1">
                        {notificacionesAceptadas.map(item => (
                          <button
                            key={item.idSemana}
                            type="button"
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors cursor-pointer group"
                            onClick={() => handleIrPedidos(item)}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-secondary dark:text-foreground leading-none">
                                {item.nombreSemana}
                              </span>
                              <span className="text-[11px] text-primary font-medium">
                                {item.cantidadPendientes} Aceptada{item.cantidadPendientes !== 1 ? 's' : ''} sin consolidar
                              </span>
                            </div>
                            <Icon icon="lucide:arrow-right" width={14} className="text-default-300 group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Sección: Pedidos por Aprobar */}
                {notificacionesPedidosPendientes.length > 0 && (
                  <>
                    <div className="border-t border-default-100 dark:border-default-100/50 mx-0" />
                    <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
                      <Icon icon="lucide:package-check" width={12} className="text-danger shrink-0" />
                      <span className="text-[10px] font-bold text-danger uppercase tracking-wider">
                        Por Aprobar
                      </span>
                      {totalPedidosPendientes > 0 && (
                        <span className="ml-auto min-w-[18px] h-4 px-1 bg-danger/20 text-danger text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                          {totalPedidosPendientes}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col divide-y divide-default-100 dark:divide-default-100/30 max-h-48 overflow-y-auto mb-1">
                      {notificacionesPedidosPendientes.map(item => (
                        <button
                          key={item.idSemana}
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors cursor-pointer group"
                          onClick={() => handleIrConglomerado(item)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-secondary dark:text-foreground leading-none">
                              {item.nombreSemana}
                            </span>
                            <span className="text-[11px] text-danger font-medium">
                              {item.cantidadPendientes} Pedido{item.cantidadPendientes !== 1 ? 's' : ''} pendiente{item.cantidadPendientes !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Icon icon="lucide:arrow-right" width={14} className="text-default-300 group-hover:text-danger transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Sección: Pedidos sin Orden de Pedido */}
                {notificacionesSinOp.length > 0 && (
                  <>
                    <div className="border-t border-default-100 dark:border-default-100/50 mx-0" />
                    <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
                      <Icon icon="lucide:file-x" width={12} className="text-secondary dark:text-foreground shrink-0" />
                      <span className="text-[10px] font-bold text-secondary dark:text-foreground uppercase tracking-wider">
                        Sin Orden de Pedido
                      </span>
                      {totalSinOp > 0 && (
                        <span className="ml-auto min-w-[18px] h-4 px-1 bg-default-200 dark:bg-default-100/30 text-secondary dark:text-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                          {totalSinOp}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col divide-y divide-default-100 dark:divide-default-100/30 max-h-48 overflow-y-auto mb-1">
                      {notificacionesSinOp.map(item => (
                        <button
                          key={item.idSemana}
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors cursor-pointer group"
                          onClick={() => handleIrProveedores(item)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-secondary dark:text-foreground leading-none">
                              {item.nombreSemana}
                            </span>
                            <span className="text-[11px] text-default-500 dark:text-default-400 font-medium">
                              {item.cantidadPendientes} pedido{item.cantidadPendientes !== 1 ? 's' : ''} sin OP
                            </span>
                          </div>
                          <Icon icon="lucide:arrow-right" width={14} className="text-default-300 group-hover:text-secondary dark:group-hover:text-foreground transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Sección: Entregas Hoy/Ayer (informativa, sin navegación) */}
                {notificacionesEntregas.length > 0 && (
                  <>
                    <div className="border-t border-default-100 dark:border-default-100/50 mx-0" />
                    <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
                      <Icon icon="lucide:truck" width={12} className="text-success shrink-0" />
                      <span className="text-[10px] font-bold text-success uppercase tracking-wider">
                        Entregas Hoy/Ayer
                      </span>
                      <span className="ml-auto min-w-[18px] h-4 px-1 bg-success/20 text-success text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {totalEntregas}
                      </span>
                    </div>

                    <div className="flex flex-col divide-y divide-default-100 dark:divide-default-100/30 max-h-48 overflow-y-auto mb-1">
                      {notificacionesEntregas.map(item => (
                        <div
                          key={`${item.idOrdenPedido}-${item.fechaEntrega}`}
                          className="w-full flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-secondary dark:text-foreground leading-none">
                              {item.nombreDistribuidora}
                            </span>
                            <span className="text-[11px] text-success font-medium">
                              {item.fechaEntrega === fechaHoy ? 'Hoy' : 'Ayer'} · {item.cantidadProductos} producto{item.cantidadProductos !== 1 ? 's' : ''} pendiente{item.cantidadProductos !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Icon icon="lucide:truck" width={13} className="text-success/50 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Botón de soporte */}
          <div className="relative">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              aria-label="Soporte"
              className="text-default-500 hover:text-primary transition-colors"
              onPress={handleAbrirSoporte}
            >
              <Icon icon="lucide:life-buoy" width={20} />
            </Button>

            {!soporteVisto && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
                1
              </span>
            )}
          </div>

          {/* Toggle de tema */}
          <Button
            isIconOnly
            variant="light"
            size="sm"
            aria-label="Toggle Theme"
            onPress={toggleTheme}
            className="text-default-500 hover:text-primary transition-colors"
          >
            <Icon icon={theme === 'light' ? 'lucide:moon' : 'lucide:sun'} width={20} />
          </Button>

          <div className="h-6 w-px bg-default-200 mx-1 hidden md:block" />

          {/* Dropdown usuario */}
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

      {/* Modal de soporte / reporte de errores */}
      <SoporteModal isOpen={soporteOpen} onOpenChange={setSoporteOpen} />
    </header>
  );
};

export default Header;
