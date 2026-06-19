import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import BodegaTransitoPage from '../../pages/bodega-transito';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// HOISTED
// ============================================
const {
  mockObtenerBodegaPaginada, mockBuscarBodega, mockBuscarBodegaCodigo,
  mockObtenerBulkBodega, mockBulkUpdateBodega, mockInicializarAbast, mockObtenerBodegaByIds,
  mockObtenerEntregasDiarias, mockObtenerFiltros, mockObtenerUnidades,
  mockToastSuccess, mockToastError, mockToastWarning,
} = vi.hoisted(() => ({
  mockObtenerBodegaPaginada: vi.fn(),
  mockBuscarBodega: vi.fn(),
  mockBuscarBodegaCodigo: vi.fn(),
  mockObtenerBulkBodega: vi.fn(),
  mockBulkUpdateBodega: vi.fn(),
  mockInicializarAbast: vi.fn(),
  mockObtenerBodegaByIds: vi.fn(),
  mockObtenerEntregasDiarias: vi.fn(),
  mockObtenerFiltros: vi.fn(),
  mockObtenerUnidades: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
}));

// ============================================
// MOCKS DE LIBRERÍAS Y MÓDULOS
// ============================================
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ initial, animate, exit, transition, children, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
    info: vi.fn(),
  }),
  useConfirm: () => vi.fn(),
}));

// FormularioProducto se importa desde la página inventario; se stubea para no arrastrar sus deps
vi.mock('../../pages/inventario', () => ({
  __esModule: true,
  default: () => null,
  FormularioProducto: () => null,
}));

// Modales del módulo
vi.mock('../../components/modals/GestionCategoriasModal', () => ({ default: () => null }));
vi.mock('../../components/modals/GestionUnidadesModal', () => ({ default: () => null }));
vi.mock('../../components/modals/GestionAbastecimientoModal', () => ({ default: () => null }));
vi.mock('../../components/modals/StockDisponiblesModal', () => ({ default: () => null }));
vi.mock('../../components/modals/ConfirmarDisponibleBodegaModal', () => ({ default: () => null }));
vi.mock('../../components/modals/ConfirmarSalidaDisponibleModal', () => ({ default: () => null }));

// Servicios
vi.mock('../../services/bodega-transito-service', () => ({
  obtenerBodegaPaginadaService: mockObtenerBodegaPaginada,
  buscarBodegaTransitoService: mockBuscarBodega,
  buscarBodegaTransitoPorCodigoService: mockBuscarBodegaCodigo,
  obtenerBulkBodegaListingService: mockObtenerBulkBodega,
  bulkUpdateBodegaStockService: mockBulkUpdateBodega,
  inicializarDesdeAbastecimientoService: mockInicializarAbast,
  obtenerBodegaByInventarioIdsService: mockObtenerBodegaByIds,
}));

vi.mock('../../services/solicitud-service', () => ({
  actualizarEstadoBodegaService: vi.fn(),
  obtenerEntregasDiariasService: mockObtenerEntregasDiarias,
  prepararEntregaService: vi.fn(),
  registrarDisponiblesService: vi.fn(),
  consultarDisponiblesPorProductoService: vi.fn().mockResolvedValue({}),
  restarDisponiblesService: vi.fn(),
}));

vi.mock('../../services/pedido-semanal-bodega-service', () => ({
  obtenerRecetaPorIdService: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/producto-service', () => ({
  obtenerFiltrosInventarioService: mockObtenerFiltros,
}));

vi.mock('../../services/unidad-medida-service', () => ({
  obtenerUnidadesActivasService: mockObtenerUnidades,
}));

vi.mock('../../services/proveedor-service', () => ({
  obtenerAbastecimientoConfirmadoService: vi.fn().mockResolvedValue({ ordenes: [] }),
  marcarEntregadosMasivoService: vi.fn(),
}));

// ============================================
// RENDERIZADOR
// ============================================
const renderPage = () =>
  render(
    <BrowserRouter>
      <HeroUIProvider disableAnimation={true}>
        <BodegaTransitoPage />
      </HeroUIProvider>
    </BrowserRouter>
  );

// ============================================
// PERMISOS
// ============================================
const defaultPerm = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };

interface PermConfig {
  bodCrud?: Partial<typeof defaultPerm>;
  pedidos?: Partial<typeof defaultPerm>;
  controlMasivo?: boolean;
  abastecimiento?: boolean;
  categorias?: boolean;
  unidades?: boolean;
}

const mockPermisos = (cfg: PermConfig = {}) =>
  vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((mod: any) => {
    if (mod === 'BODEGA_TRANSITO') return { ...defaultPerm, ...(cfg.bodCrud ?? {}) } as any;
    if (mod === 'GESTION_PEDIDOS_DIARIOS') return { ...defaultPerm, ...(cfg.pedidos ?? {}) } as any;
    if (mod === 'BOD_CONTROL_MASIVO') return { ...defaultPerm, canRead: !!cfg.controlMasivo } as any;
    if (mod === 'BOD_ABASTECIMIENTO') return { ...defaultPerm, canRead: !!cfg.abastecimiento } as any;
    if (mod === 'GESTION_CATEGORIAS') return { ...defaultPerm, canCreate: !!cfg.categorias } as any;
    if (mod === 'GESTION_UNIDADES') return { ...defaultPerm, canCreate: !!cfg.unidades } as any;
    return { ...defaultPerm } as any;
  });

// ============================================
// DATOS DE PRUEBA
// ============================================
const bodegaDisponible = {
  idBodegaTransito: 1, idInventario: 1, idProducto: 1,
  nombreProducto: 'Harina de Trigo', codProducto: 'P001', descripcionProducto: 'Saco 25kg',
  idCategoria: 1, nombreCategoria: 'Abarrotes', idUnidad: 1, nombreUnidad: 'kilo',
  esFraccionario: true, stock: 8, stockLimit: 10,
};
const bodegaSinStock = {
  idBodegaTransito: 2, idInventario: 2, idProducto: 2,
  nombreProducto: 'Azúcar Flor', codProducto: 'P002', descripcionProducto: 'Bolsa 1kg',
  idCategoria: 1, nombreCategoria: 'Abarrotes', idUnidad: 1, nombreUnidad: 'kilo',
  esFraccionario: true, stock: 0, stockLimit: 5,
};

const respuestaBodega = {
  data: [bodegaDisponible, bodegaSinStock],
  page: 1, pageSize: 40, totalPaginas: 1, totalRegistros: 2,
};

const findButton = (text: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === text) as HTMLButtonElement | undefined;

// ============================================
// SUITE
// ============================================
describe('BodegaTransitoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerBodegaPaginada.mockResolvedValue(respuestaBodega);
    mockBuscarBodega.mockResolvedValue(respuestaBodega);
    mockBuscarBodegaCodigo.mockResolvedValue(respuestaBodega);
    mockObtenerBulkBodega.mockResolvedValue({ content: [], page: 1, limit: 20, totalPages: 1, totalElements: 0 });
    mockObtenerEntregasDiarias.mockResolvedValue([]);
    mockObtenerFiltros.mockResolvedValue({ categorias: [{ id: 1, nombre: 'Abarrotes' }], unidades: [{ id: 1, nombre: 'kilo' }] });
    mockObtenerUnidades.mockResolvedValue([{ id: 1, nombre: 'kilo', abreviatura: 'kg' }]);
  });

  afterEach(() => cleanup());

  // BIM-07
  it('BIM-07: carga inicial llama a obtenerBodegaPaginadaService (page 1) y a los filtros', async () => {
    mockPermisos({ bodCrud: { canRead: true } });
    renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());
    expect(mockObtenerBodegaPaginada).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 40 }));
    expect(mockObtenerFiltros).toHaveBeenCalled();
    expect(mockObtenerUnidades).toHaveBeenCalled();
  });

  // BIM-08
  it('BIM-08: renderiza los productos de bodega de tránsito', async () => {
    mockPermisos({ bodCrud: { canRead: true } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Harina de Trigo')).toBeInTheDocument());
    expect(screen.getByText('Azúcar Flor')).toBeInTheDocument();
  });

  // BIM-09
  it('BIM-09: muestra el botón "Control Masivo" con permiso BOD_CONTROL_MASIVO', async () => {
    mockPermisos({ bodCrud: { canRead: true }, controlMasivo: true });
    renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());
    expect(findButton('Control Masivo')).toBeTruthy();
  });

  // BIM-10
  it('BIM-10: oculta el botón "Control Masivo" sin permiso BOD_CONTROL_MASIVO', async () => {
    mockPermisos({ bodCrud: { canRead: true, canCreate: true }, controlMasivo: false });
    renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());
    expect(findButton('Control Masivo')).toBeFalsy();
    // El botón "Nuevo" sí está presente (BODEGA_TRANSITO.canCreate)
    expect(findButton('Nuevo')).toBeTruthy();
  });

  // BIM-11
  it('BIM-11: muestra el botón "Nuevo" con permiso BODEGA_TRANSITO.canCreate', async () => {
    mockPermisos({ bodCrud: { canRead: true, canCreate: true } });
    renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());
    expect(findButton('Nuevo')).toBeTruthy();
  });

  // BIM-12
  it('BIM-12: el botón de vista Pedidos Diarios no se renderiza sin GESTION_PEDIDOS_DIARIOS.canRead', async () => {
    mockPermisos({ bodCrud: { canRead: true }, pedidos: { canRead: false } });
    const { container } = renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());
    // El riel de navegación solo tiene el botón de inventario (1 botón w-12 h-12)
    const toggles = container.querySelectorAll('button.w-12.h-12');
    expect(toggles.length).toBe(1);
  });

  // BIM-13
  it('BIM-13: al cambiar a la vista Pedidos Diarios se cargan las entregas de la semana', async () => {
    mockPermisos({ bodCrud: { canRead: true }, pedidos: { canRead: true } });
    const { container } = renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());

    const toggles = container.querySelectorAll('button.w-12.h-12');
    expect(toggles.length).toBe(2); // inventario + pedidos
    fireEvent.click(toggles[1]);

    await waitFor(() => expect(mockObtenerEntregasDiarias).toHaveBeenCalled());
  });

  // BIM-14
  it('BIM-14: marca el estado "Sin stock" para un producto con stock 0', async () => {
    mockPermisos({ bodCrud: { canRead: true } });
    renderPage();
    await waitFor(() => expect(screen.getByText('Azúcar Flor')).toBeInTheDocument());
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });

  // BIM-15
  it('BIM-15: muestra los íconos de gestión de Categorías y Unidades (modales reutilizados de Inventario)', async () => {
    mockPermisos({ bodCrud: { canRead: true }, categorias: true, unidades: true });
    renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());
    // Los modales GestionCategoriasModal y GestionUnidadesModal son los mismos que usa Inventario;
    // sus disparadores se gatean por GESTION_CATEGORIAS.canCreate y GESTION_UNIDADES.canCreate.
    expect(document.querySelector('button[title="Categorías"]')).toBeTruthy();
    expect(document.querySelector('button[title="Unidades"]')).toBeTruthy();
  });

  // BIM-16
  it('BIM-16: la vista Gestión de Pedidos Diarios agrupa las entregas del día por sala', async () => {
    const hoyStr = (() => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      return d.toISOString().slice(0, 10);
    })();
    const entregaConSala = {
      fecha: hoyStr,
      totalSolicitudes: 1,
      salas: [
        {
          idSala: 1, nombreSala: 'Sala A-101', codSala: 'A101',
          solicitudes: [
            {
              idSolicitud: 10, estadoSolicitud: 'ACEPTADA', horaInicio: '10:00',
              rangoHoras: '10:00 - 11:20', nombreSeccion: '001D', nombreAsignatura: 'Cocina',
              nombreDocente: 'Chef Test', cantInscritos: 20, nombreReceta: 'Pan Amasado',
              observaciones: null,
              productos: [
                { idProducto: 1, nombreProducto: 'Harina', cantidad: 5, unidadAbreviada: 'kg', esFraccionario: true, observacion: null, stockTransito: 10, diferencia: 5 },
              ],
            },
          ],
        },
      ],
    };
    mockObtenerEntregasDiarias.mockResolvedValue([entregaConSala]);
    mockPermisos({ bodCrud: { canRead: true }, pedidos: { canRead: true, canCreate: true } });

    const { container } = renderPage();
    await waitFor(() => expect(mockObtenerBodegaPaginada).toHaveBeenCalled());

    const toggles = container.querySelectorAll('button.w-12.h-12');
    fireEvent.click(toggles[1]); // ir a la vista Pedidos Diarios

    await waitFor(() => expect(screen.getByText('Sala A-101')).toBeInTheDocument());
  });
});
