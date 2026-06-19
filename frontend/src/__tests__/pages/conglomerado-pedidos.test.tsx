import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import ConglomeradoPedidosPage from '../../pages/conglomerado-pedidos';
import * as authContext from '../../contexts/auth-context';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// HOISTED: disponibles antes del hoisting de vi.mock
// ============================================

const {
  mockConsolidateQuery,
  mockAprobarPedidos,
  mockReservarDisponible,
  mockObtenerOrdenes,
  mockRechazarPedido,
  mockToastSuccess,
  mockToastError,
  mockToastInfo,
  mockUsePeriodoSemana,
} = vi.hoisted(() => ({
  mockConsolidateQuery:    vi.fn(),
  mockAprobarPedidos:      vi.fn(),
  mockReservarDisponible:  vi.fn(),
  mockObtenerOrdenes:      vi.fn(),
  mockRechazarPedido:      vi.fn(),
  mockToastSuccess:        vi.fn(),
  mockToastError:          vi.fn(),
  mockToastInfo:           vi.fn(),
  mockUsePeriodoSemana:    vi.fn(),
}));

// ============================================
// MOCKS LIBRERÍAS EXTERNAS
// ============================================

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../components/BookPageLoader', () => ({
  default: ({ message }: { message: string }) => <div>{message}</div>,
}));

// ============================================
// MOCKS HOOKS
// ============================================

vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error:   mockToastError,
    info:    mockToastInfo,
    warning: vi.fn(),
  }),
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

// ============================================
// MOCKS CONTEXTOS
// ============================================

vi.mock('../../contexts/periodo-semana-context', () => ({
  usePeriodoSemana: () => mockUsePeriodoSemana(),
}));

// ============================================
// MOCKS SERVICIOS
// ============================================

vi.mock('../../services/solicitud-service', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/solicitud-service')>();
  return {
    ...original,
    consolidatePedidoQueryService:   mockConsolidateQuery,
    aprobarPedidosService:           mockAprobarPedidos,
    reservarDisponiblePedidoService: mockReservarDisponible,
    obtenerOrdenesPorPedidoService:  mockObtenerOrdenes,
    rechazarPedidoService:           mockRechazarPedido,
  };
});

// ============================================
// DATOS DE PRUEBA
// ============================================

const semanaTest = {
  idSemana:     3,
  nombreSemana: 'Semana 3',
  fechaInicio:  '2026-05-25',
  fechaFin:     '2026-05-31',
  anio:         2026,
  semestre:     1,
};

const mkSolicitudVinculada = (
  id: number,
  fecha: string,
  rangoHoras: string,
  nombreReceta    = 'Pan Amasado',
  nombreSeccion   = `S${id}`,
  nombreAsignatura = 'Gastronomía Básica',
) => ({
  idSolicitud:     id,
  fechaSolicitada: fecha,
  estadoSolicitud: 'PROCESADO',
  nombreReceta,
  observaciones:   '',
  cantProductos:   1,
  productosSolicitados: [{ nombreProducto: 'Harina', cantidad: 10, unidadAbreviada: 'kg' }],
  seccion: {
    nombreAsignatura,
    nombreSeccion,
    nombreDocente: 'Prof. García',
    cantInscritos: 20,
  },
  horarios: { rangoHoras, nombreSala: 'Sala A' },
});

const mkPedidoAprobacion = (
  id: number,
  estado: string,
  productos: any[] = [],
  tieneOpActiva  = false,
) => ({ idPedido: id, estadoPedido: estado, tieneOpActiva, productos });

const mkProductoAprobacion = (nombre: string, cantidad: number, abreviatura = 'kg') => ({
  nombreProducto: nombre,
  abreviatura,
  cantidadPedido:      cantidad,
  reservado:           0,
  disponibleReal:      0,
  solicitadoFirme:     0,
  solicitadoRevision:  0,
});

const mkPedidoResumen = (id: number, productosConsolidados: any[]) => ({
  idPedido: id,
  productosConsolidados,
});

const mkProductoResumen = (nombre: string, cantidad: number, abreviatura = 'kg') => ({
  nombreProducto: nombre,
  abreviatura,
  cantidadTotal:  cantidad,
  totalSecciones: 1,
  detalles:       [],
});

const mkPedidoCompleto = (solicitudes: any[], productos: any[] = []) => ({
  totalSolicitudes: solicitudes.length,
  totalProductos:   productos.length,
  productos,
  solicitudesVinculadas: solicitudes,
});

const emptyConsolidate = {
  pedidosCompletos:  [],
  pedidosResumen:    [],
  pedidosAprobacion: [],
};

// ============================================
// HELPERS DE RENDERIZADO Y CONTEXTO
// ============================================

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <BrowserRouter>
      <HeroUIProvider disableAnimation={true}>
        {ui}
      </HeroUIProvider>
    </BrowserRouter>
  );

const periodoVacio = {
  semanaId:           null,
  semanas:            [],
  periodos:           [],
  seleccionarSemana:  vi.fn(),
  seleccionarPeriodo: vi.fn(),
  isLoading:          false,
};

const periodoConSemana = {
  ...periodoVacio,
  semanaId: '3',
  semanas:  [semanaTest],
  periodos: [{ anio: 2026, semestres: [1] }],
};

const mockAdmin = () =>
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: 1, email: 'admin@kuhub.cl', nombre: 'Admin', rol: 'Administrador' },
    isAuthenticated:  true,
    isLoading:        false,
    login:            vi.fn(),
    logout:           vi.fn(),
    canAccessPage:    vi.fn(() => true),
    userRole:         null,
  } as any);

const mockPermBase = () =>
  vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
    isAdmin:        false,
    canRead:        vi.fn(() => false),
    canCreate:      vi.fn(() => false),
    canUpdate:      vi.fn(() => false),
    canDelete:      vi.fn(() => false),
    canAccess:      vi.fn(() => false),
    getAccessLevel: vi.fn(() => 0),
    isLoading:      false,
  } as any);

const defaultMod = {
  canRead:     false,
  canCreate:   false,
  canUpdate:   false,
  canDelete:   false,
  accessLevel: 'none' as const,
  hasAccess:   false,
  isLoading:   false,
};

// Todos los permisos del módulo Conglomerado habilitados
const mockAllCongPerms = () =>
  vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((mod) => {
    if (mod === 'CONG_APROBAR_PEDIDO')   return { ...defaultMod, canUpdate: true };
    if (mod === 'CONG_RECHAZAR_PEDIDO')  return { ...defaultMod, canUpdate: true };
    if (mod === 'CONG_VISTA_APROBACION') return { ...defaultMod, canRead: true };
    if (mod === 'CONG_VISTA_CRONOGRAMA') return { ...defaultMod, canRead: true };
    if (mod === 'CONG_VISTA_TOTALES')    return { ...defaultMod, canRead: true };
    if (mod === 'CONG_VISTA_CATEGORIAS') return { ...defaultMod, canRead: true, canCreate: true };
    return defaultMod;
  });

const waitForLoad = () =>
  waitFor(
    () => expect(screen.queryByText('Cargando pedidos')).not.toBeInTheDocument(),
    { timeout: 3000 },
  );

// ============================================
// SUITE 1: Carga y Estado (CONG-01, 02, 03, 04, 06)
// ============================================

describe('ConglomeradoPedidosPage — Carga y Estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermBase();
    mockAllCongPerms();
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
    mockConsolidateQuery.mockResolvedValue(emptyConsolidate);
    mockAprobarPedidos.mockResolvedValue({});
    mockReservarDisponible.mockResolvedValue(0);
  });
  afterEach(cleanup);

  it('CONG-01: sin permiso CONG_VISTA_APROBACION la pestaña no se renderiza', async () => {
    vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((mod) => {
      if (mod === 'CONG_VISTA_CRONOGRAMA') return { ...defaultMod, canRead: true };
      return defaultMod;
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    expect(screen.queryByRole('button', { name: /Aprobación de Pedidos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cronograma Semanal/ })).toBeInTheDocument();
  });

  it('CONG-02: con semanaId llama consolidatePedidoQueryService con fechas de la semana', async () => {
    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    expect(mockConsolidateQuery).toHaveBeenCalledTimes(1);
    expect(mockConsolidateQuery).toHaveBeenCalledWith({
      fechaInicio: '2026-05-25',
      fechaFin:    '2026-05-31',
    });
  });

  it('CONG-03: sin semanaId muestra empty state de selección de semana', async () => {
    mockUsePeriodoSemana.mockReturnValue(periodoVacio);

    renderWithProviders(<ConglomeradoPedidosPage />);

    expect(
      screen.getByText('Seleccione una semana para ver el pedido consolidado.'),
    ).toBeInTheDocument();
    expect(mockConsolidateQuery).not.toHaveBeenCalled();
  });

  it('CONG-04: con semanaId y sin datos muestra empty state de pedidos', async () => {
    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    expect(
      screen.getByText('No hay pedidos consolidados para esta semana.'),
    ).toBeInTheDocument();
  });

  it('CONG-06: los contadores de resumen se calculan correctamente', async () => {
    const sol1 = mkSolicitudVinculada(1, '2026-05-26', '08:00-09:30', 'Pan', 'S1', 'Gastronomía');
    const sol2 = mkSolicitudVinculada(2, '2026-05-26', '10:00-11:30', 'Torta', 'S2', 'Pastelería');
    const sol3 = mkSolicitudVinculada(3, '2026-05-27', '08:00-09:30', 'Pan', 'S1', 'Gastronomía');

    mockConsolidateQuery.mockResolvedValue({
      pedidosCompletos: [mkPedidoCompleto([sol1, sol2, sol3])],
      pedidosResumen: [
        mkPedidoResumen(1, [
          mkProductoResumen('Harina', 30),
          mkProductoResumen('Azúcar', 20),
        ]),
      ],
      pedidosAprobacion: [],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    // Sol. procesadas = 3
    const labelProcesadas = screen.getByText('Sol. procesadas');
    expect(labelProcesadas.previousElementSibling?.textContent).toBe('3');

    // Productos únicos = 2
    const labelProductos = screen.getByText('Productos únicos');
    expect(labelProductos.previousElementSibling?.textContent).toBe('2');

    // Días con clases = 2
    const labelDias = screen.getByText('Días con clases');
    expect(labelDias.previousElementSibling?.textContent).toBe('2');
  });
});

// ============================================
// SUITE 2: Vista Aprobación — Aprobación (CONG-07, 08, 09, 10)
// ============================================

describe('ConglomeradoPedidosPage — Aprobación de Pedidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermBase();
    mockAllCongPerms();
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
    mockAprobarPedidos.mockResolvedValue({});
    mockReservarDisponible.mockResolvedValue(3);
  });
  afterEach(cleanup);

  it('CONG-07: pedido PENDIENTE con permiso muestra botón Aprobar pedido', async () => {
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosAprobacion: [
        mkPedidoAprobacion(10, 'PENDIENTE', [mkProductoAprobacion('Harina', 50)]),
      ],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    expect(screen.getByRole('button', { name: /Aprobar pedido/ })).toBeInTheDocument();
  });

  it('CONG-08: aprobar sin reservar solo llama aprobarPedidosService', async () => {
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosAprobacion: [
        mkPedidoAprobacion(10, 'PENDIENTE', [mkProductoAprobacion('Harina', 50)]),
      ],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    // Abrir modal de reserva
    fireEvent.click(screen.getByRole('button', { name: /Aprobar pedido/ }));
    await waitFor(
      () => expect(screen.getByText(/Reservar disponibles del Pedido #10/)).toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Click "Aprobar sin reservar"
    fireEvent.click(screen.getByRole('button', { name: /Aprobar sin reservar/ }));

    await waitFor(
      () => expect(mockAprobarPedidos).toHaveBeenCalledWith({
        idsPedidos: [10],
        estado: 'APROBADO',
      }),
      { timeout: 3000 },
    );
    expect(mockReservarDisponible).not.toHaveBeenCalled();
  });

  it('CONG-09: aprobar con reserva llama reservarDisponiblePedidoService antes de aprobar', async () => {
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosAprobacion: [
        mkPedidoAprobacion(10, 'PENDIENTE', [mkProductoAprobacion('Harina', 50)]),
      ],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: /Aprobar pedido/ }));
    await waitFor(
      () => expect(screen.getByText(/Reservar disponibles del Pedido #10/)).toBeInTheDocument(),
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByRole('button', { name: /Reservar y aprobar/ }));

    await waitFor(
      () => expect(mockReservarDisponible).toHaveBeenCalledWith(10),
      { timeout: 3000 },
    );
    await waitFor(
      () => expect(mockAprobarPedidos).toHaveBeenCalledWith({
        idsPedidos: [10],
        estado: 'APROBADO',
      }),
      { timeout: 3000 },
    );
    // La reserva debe ocurrir antes de la aprobación
    const reservaOrder = mockReservarDisponible.mock.invocationCallOrder[0];
    const aprobarOrder = mockAprobarPedidos.mock.invocationCallOrder[0];
    expect(reservaOrder).toBeLessThan(aprobarOrder);
  });

  it('CONG-10: aprobar todos envía únicamente los IDs de pedidos PENDIENTE', async () => {
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosAprobacion: [
        mkPedidoAprobacion(10, 'PENDIENTE', [mkProductoAprobacion('Harina', 50)]),
        mkPedidoAprobacion(11, 'PENDIENTE', [mkProductoAprobacion('Aceite', 20, 'L')]),
        mkPedidoAprobacion(12, 'APROBADO',  [mkProductoAprobacion('Sal', 5)]),
      ],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: /Aprobar 2 pendientes/ }));

    await waitFor(
      () => expect(mockAprobarPedidos).toHaveBeenCalledWith({
        idsPedidos: [10, 11],
        estado: 'APROBADO',
      }),
      { timeout: 3000 },
    );
  });
});

// ============================================
// SUITE 3: Vista Aprobación — Rechazo (CONG-11, 12, 13)
// ============================================

describe('ConglomeradoPedidosPage — Rechazo de Pedidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermBase();
    mockAllCongPerms();
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosAprobacion: [
        mkPedidoAprobacion(10, 'PENDIENTE', [mkProductoAprobacion('Harina', 50)]),
      ],
    });
    mockObtenerOrdenes.mockResolvedValue([]);
    mockRechazarPedido.mockResolvedValue({
      solicitudesRechazadas: 2,
      ordenesCanceladas:     0,
      reservasLiberadas:     0,
    });
  });
  afterEach(cleanup);

  it('CONG-11: sin permiso CONG_RECHAZAR_PEDIDO el botón Rechazar pedido no aparece', async () => {
    vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((mod) => {
      if (mod === 'CONG_APROBAR_PEDIDO')   return { ...defaultMod, canUpdate: true };
      if (mod === 'CONG_RECHAZAR_PEDIDO')  return { ...defaultMod, canUpdate: false }; // sin permiso
      if (mod === 'CONG_VISTA_APROBACION') return { ...defaultMod, canRead: true };
      if (mod === 'CONG_VISTA_CRONOGRAMA') return { ...defaultMod, canRead: true };
      if (mod === 'CONG_VISTA_TOTALES')    return { ...defaultMod, canRead: true };
      if (mod === 'CONG_VISTA_CATEGORIAS') return { ...defaultMod, canRead: true, canCreate: true };
      return defaultMod;
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    expect(screen.queryByRole('button', { name: /Rechazar pedido/ })).not.toBeInTheDocument();
  });

  it('CONG-12: flujo de rechazo llama rechazarPedidoService con el motivo ingresado', async () => {
    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    // Abrir modal de rechazo
    fireEvent.click(screen.getByRole('button', { name: /Rechazar pedido/ }));
    await waitFor(
      () => expect(screen.getByText(/Rechazar Pedido #10/)).toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Esperar que se carguen las OPs (retorna [])
    await waitFor(
      () => expect(mockObtenerOrdenes).toHaveBeenCalledWith(10),
      { timeout: 3000 },
    );

    // Ingresar motivo
    const textarea = screen.getByLabelText(/Motivo del rechazo/i);
    fireEvent.change(textarea, { target: { value: 'Sin presupuesto disponible' } });

    // Confirmar rechazo — el botón modal es el último "Rechazar pedido" en el DOM
    const rechazarBtns = screen.getAllByRole('button', { name: /Rechazar pedido/ });
    fireEvent.click(rechazarBtns[rechazarBtns.length - 1]);

    await waitFor(
      () => expect(mockRechazarPedido).toHaveBeenCalledWith(
        10,
        'Sin presupuesto disponible',
        false,
      ),
      { timeout: 3000 },
    );
  });

  it('CONG-13: OP en estado RECIBIDA deja el botón de confirmación deshabilitado', async () => {
    mockObtenerOrdenes.mockResolvedValue([
      { idOrdenPedido: 1, nombreProveedor: 'Proveedor A', estado: 'RECIBIDA' },
    ]);

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: /Rechazar pedido/ }));
    await waitFor(
      () => expect(screen.getByText(/Rechazar Pedido #10/)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(
      () => expect(mockObtenerOrdenes).toHaveBeenCalledWith(10),
      { timeout: 3000 },
    );

    // El botón de confirmar debe quedar deshabilitado aunque se ingrese motivo
    const textarea = screen.getByLabelText(/Motivo del rechazo/i);
    fireEvent.change(textarea, { target: { value: 'Cancelar por OP recibida' } });

    const rechazarBtns = screen.getAllByRole('button', { name: /Rechazar pedido/ });
    const confirmBtn = rechazarBtns[rechazarBtns.length - 1];
    expect(confirmBtn).toHaveAttribute('data-disabled', 'true');
  });
});

// ============================================
// SUITE 4: Vista Cronograma y Totales (CONG-14, 15, 16)
// ============================================

describe('ConglomeradoPedidosPage — Cronograma y Totales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermBase();
    mockAllCongPerms();
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
  });
  afterEach(cleanup);

  it('CONG-14: vista cronograma agrupa solicitudes por día de la semana', async () => {
    // 2026-05-25 = Lunes, 2026-05-26 = Martes
    const sol1 = mkSolicitudVinculada(1, '2026-05-25', '08:00-09:30', 'Pan Amasado', 'S1');
    const sol2 = mkSolicitudVinculada(2, '2026-05-26', '10:00-11:30', 'Torta Mil Hojas', 'S2');

    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosCompletos: [mkPedidoCompleto([sol1, sol2])],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: /Cronograma Semanal/ }));

    await waitFor(() => {
      expect(screen.getByText('LUN')).toBeInTheDocument();
      expect(screen.getByText('MAR')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/§S1/)).toBeInTheDocument();
    expect(screen.getByText(/§S2/)).toBeInTheDocument();
  });

  it('CONG-15: búsqueda en cronograma filtra solicitudes por nombre de receta', async () => {
    const sol1 = mkSolicitudVinculada(1, '2026-05-25', '08:00-09:30', 'Pan Amasado', 'S1');
    const sol2 = mkSolicitudVinculada(2, '2026-05-25', '10:00-11:30', 'Torta Mil Hojas', 'S2');

    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosCompletos: [mkPedidoCompleto([sol1, sol2])],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: /Cronograma Semanal/ }));
    await waitFor(
      () => expect(screen.getByText(/§S1/)).toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Filtrar por "pan"
    const searchInput = screen.getByPlaceholderText(/Buscar receta/i);
    fireEvent.change(searchInput, { target: { value: 'pan' } });

    await waitFor(() => {
      expect(screen.queryByText(/§S2/)).not.toBeInTheDocument();
      expect(screen.queryByText('Torta Mil Hojas')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/§S1/)).toBeInTheDocument();
  });

  it('CONG-16: vista Totales muestra el merge cross-pedido del mismo producto', async () => {
    // Harina: 50 kg en pedido 1 + 30 kg en pedido 2 = 80 kg total
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosResumen: [
        mkPedidoResumen(1, [mkProductoResumen('Harina', 50), mkProductoResumen('Azúcar', 20)]),
        mkPedidoResumen(2, [mkProductoResumen('Harina', 30)]),
      ],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: /Totales del Pedido/ }));

    await waitFor(
      () => expect(screen.getByText('Totales del Pedido')).toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Harina aparece solo una vez (merge de 2 pedidos)
    const harinaElements = screen.getAllByText('Harina');
    expect(harinaElements).toHaveLength(1);

    // Total consolidado = 80
    expect(screen.getByText('80')).toBeInTheDocument();
  });
});

// ============================================
// SUITE 5: Permisos y Sub-vistas (CONG-19, 20)
// ============================================

describe('ConglomeradoPedidosPage — Permisos y Sub-vistas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermBase();
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
  });
  afterEach(cleanup);

  it('CONG-19: sin canCreate en CONG_VISTA_CATEGORIAS no aparece el botón Descargar Excel', async () => {
    vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((mod) => {
      if (mod === 'CONG_VISTA_APROBACION') return { ...defaultMod, canRead: true };
      if (mod === 'CONG_VISTA_CRONOGRAMA') return { ...defaultMod, canRead: true };
      if (mod === 'CONG_VISTA_TOTALES')    return { ...defaultMod, canRead: true };
      if (mod === 'CONG_VISTA_CATEGORIAS') return { ...defaultMod, canRead: true, canCreate: false };
      return defaultMod;
    });
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosResumen: [mkPedidoResumen(1, [mkProductoResumen('Harina', 50)])],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    expect(screen.queryByRole('button', { name: /Descargar Excel/ })).not.toBeInTheDocument();
  });

  it('CONG-20: sub-vista Unificada acumula cantidades del mismo producto entre pedidos', async () => {
    mockAllCongPerms();
    // Aceite: 10 L en pedido 10 + 5 L en pedido 11 = 15 L total
    mockConsolidateQuery.mockResolvedValue({
      ...emptyConsolidate,
      pedidosAprobacion: [
        mkPedidoAprobacion(10, 'PENDIENTE', [mkProductoAprobacion('Aceite', 10, 'L')]),
        mkPedidoAprobacion(11, 'PENDIENTE', [mkProductoAprobacion('Aceite', 5, 'L')]),
      ],
    });

    renderWithProviders(<ConglomeradoPedidosPage />);
    await waitForLoad();

    // Cambiar a sub-vista Unificada
    fireEvent.click(screen.getByRole('button', { name: /Vista Unificada/ }));

    await waitFor(() => {
      // Aceite aparece una sola vez (merge de 2 pedidos)
      const aceiteElements = screen.getAllByText('Aceite');
      expect(aceiteElements).toHaveLength(1);
    }, { timeout: 3000 });

    // Total consolidado = 15
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
