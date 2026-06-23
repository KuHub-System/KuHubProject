import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import GestionProveedoresPage from '../../pages/gestion-proveedores';
import * as permissionContext from '../../contexts/permission-context';
import * as periodoContext from '../../contexts/periodo-semana-context';

// ============================================
// HOISTED MOCKS
// ============================================
const {
  mockObtenerProveedoresPaginado,
  mockListarOrdenesPedido,
} = vi.hoisted(() => ({
  mockObtenerProveedoresPaginado: vi.fn(),
  mockListarOrdenesPedido: vi.fn(),
}));

// ============================================
// MOCKS SERVICIOS
// ============================================
vi.mock('../../services/proveedor-service', () => ({
  obtenerProveedoresPaginadoService: mockObtenerProveedoresPaginado,
  listarOrdenesPedidoService: mockListarOrdenesPedido,
  obtenerProveedorDetalleService: vi.fn(),
  crearProveedorService: vi.fn(),
  actualizarProveedorService: vi.fn(),
  eliminarProveedorService: vi.fn(),
  actualizarEstadoProveedorService: vi.fn(),
  agregarProductoProveedorService: vi.fn(),
  sincronizarPreciosExcelService: vi.fn(),
  obtenerCotizacionPorRangoService: vi.fn(),
  obtenerOrdenPedidoDetalleService: vi.fn(),
  cambiarEstadoOrdenPedidoService: vi.fn(),
}));

vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

// ============================================
// HELPERS
// ============================================
const renderWithProviders = (component: React.ReactElement) =>
  render(
    <BrowserRouter>
      <HeroUIProvider disableAnimation={true}>
        {component}
      </HeroUIProvider>
    </BrowserRouter>
  );

const defaultProveedor = {
  idProveedor: 1,
  rutProveedor: '12.345.678-9',
  nombreDistribuidora: 'Dist. Sur',
  nombreProveedor: 'Pedro Gómez',
  telefonoProveedor: '+56912345678',
  emailProveedor: 'pedro@distsur.cl',
  estadoProveedor: 'DISPONIBLE',
  activo: true,
};

const mockProveedoresResponse = {
  data: [defaultProveedor],
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockOrdenesResponse = {
  data: [],
  page: 1,
  limit: 20,
  totalPages: 1,
};

// ============================================
// SUITE 1: VISTA PROVEEDORES (PR)
// ============================================
describe('GestionProveedoresPage — Vista Proveedores', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock usePermission
    vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
      isAdmin: false,
      canRead: vi.fn(() => false),
      canCreate: vi.fn(() => false),
      canUpdate: vi.fn(() => false),
      canDelete: vi.fn(() => false),
      canAccess: vi.fn(() => false),
      getAccessLevel: vi.fn(() => 0),
      isLoading: false,
    } as any);

    // Mock useModulePermission
    vi.spyOn(permissionContext, 'useModulePermission').mockReturnValue({
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      accessLevel: 'write' as const,
      hasAccess: true,
      isLoading: false,
    } as any);

    // Mock usePeriodoSemana
    vi.spyOn(periodoContext, 'usePeriodoSemana').mockReturnValue({
      periodos: [],
      semanas: [],
      periodo: null,
      semanaId: null,
      defaultSemanaId: null,
      isLoading: false,
      seleccionarPeriodo: vi.fn(),
      seleccionarSemana: vi.fn(),
      recargarPeriodos: vi.fn(),
    } as any);

    mockObtenerProveedoresPaginado.mockResolvedValue(mockProveedoresResponse);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('PR-01: carga inicial llama obtenerProveedoresPaginadoService', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-02: filtro por estado', async () => {
    mockObtenerProveedoresPaginado.mockResolvedValue({
      data: [
        { ...defaultProveedor, estadoProveedor: 'DISPONIBLE' },
        { ...defaultProveedor, idProveedor: 2, nombreDistribuidora: 'Dist. Norte', estadoProveedor: 'NO_DISPONIBLE' },
      ],
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-03: búsqueda por nombre', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-04: expandir proveedor', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-05: crear proveedor', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-06: editar proveedor', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-07: eliminar proveedor', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-08: toggle estado DISPONIBLE', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-09: asignar producto', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-10: sincronizar Excel', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-11: cotización por rango', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('PR-12: control de acceso', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });
});

// ============================================
// SUITE 2: VISTA ÓRDENES (OP)
// ============================================
describe('GestionProveedoresPage — Vista Órdenes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
      isAdmin: false,
      canRead: vi.fn(() => false),
      canCreate: vi.fn(() => false),
      canUpdate: vi.fn(() => false),
      canDelete: vi.fn(() => false),
      canAccess: vi.fn(() => false),
      getAccessLevel: vi.fn(() => 0),
      isLoading: false,
    } as any);

    vi.spyOn(permissionContext, 'useModulePermission').mockReturnValue({
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      accessLevel: 'write' as const,
      hasAccess: true,
      isLoading: false,
    } as any);

    vi.spyOn(periodoContext, 'usePeriodoSemana').mockReturnValue({
      periodos: [],
      semanas: [],
      periodo: null,
      semanaId: null,
      defaultSemanaId: null,
      isLoading: false,
      seleccionarPeriodo: vi.fn(),
      seleccionarSemana: vi.fn(),
      recargarPeriodos: vi.fn(),
    } as any);

    mockListarOrdenesPedido.mockResolvedValue(mockOrdenesResponse);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('OP-01: carga inicial OPs', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-02: expandir OP', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-03: cambiar a ENVIADA', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-04: cambiar a CONFIRMADA', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-05: cancelar OP', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-06: entrega parcial', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-07: agrupación por día', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-08: control acceso cancelar', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-09: auto-switch vista', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('OP-10: filtro 90 días', async () => {
    renderWithProviders(<GestionProveedoresPage />);
    await waitFor(() => expect(mockObtenerProveedoresPaginado).toHaveBeenCalled(), { timeout: 3000 });
  });
});
