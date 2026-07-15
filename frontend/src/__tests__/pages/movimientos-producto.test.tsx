import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import InventarioPage from '../../pages/inventario';
import * as authContext from '../../contexts/auth-context';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// "Movimientos" se fusionó como pestaña de InventarioPage (dejó de ser una página
// standalone en /movimientos-producto). Este archivo prueba la misma funcionalidad
// vía la pestaña, entrando por la ruta /movimientos que la abre por defecto.
// ============================================

// ============================================
// HOISTED: disponibles antes del hoisting de vi.mock
// ============================================
const {
  mockFindMovimientos,
  mockObtenerProductosPaginados, mockObtenerFiltros,
  mockObtenerCategorias, mockObtenerUnidades,
  mockBuscarProductos, mockBuscarPorCodigo,
  mockObtenerBulkProductos,
} = vi.hoisted(() => ({
  mockFindMovimientos: vi.fn(),
  mockObtenerProductosPaginados: vi.fn(),
  mockObtenerFiltros: vi.fn(),
  mockObtenerCategorias: vi.fn(),
  mockObtenerUnidades: vi.fn(),
  mockBuscarProductos: vi.fn(),
  mockBuscarPorCodigo: vi.fn(),
  mockObtenerBulkProductos: vi.fn(),
}));

// ============================================
// MOCKS
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
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
  useConfirm: () => vi.fn(),
}));

vi.mock('../../services/inventario/movimiento-service', () => ({
  findMovimientosConFiltros: mockFindMovimientos,
}));

vi.mock('../../services/shared/storage-service', () => ({
  obtenerCategorias: vi.fn().mockReturnValue([{ id: 1, nombre: 'Categoría 1' }]),
  obtenerUnidades: vi.fn().mockReturnValue([{ id: 1, nombre: 'unidad' }]),
}));

vi.mock('../../services/inventario/bodega-transito-service', () => ({
  actualizarBodegaTransitoConProductoService: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/solicitud/solicitud-service', () => ({
  obtenerProyeccionAbastecimientoService: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../components/modals/GestionCategoriasModal', () => ({ default: () => null }));
vi.mock('../../components/modals/GestionUnidadesModal', () => ({ default: () => null }));

vi.mock('../../services/inventario/inventario-service', () => ({
  obtenerBulkProductoInventoryListingService: mockObtenerBulkProductos,
  bulkUpdateInventoryStockService: vi.fn().mockResolvedValue({ exitosos: [], fallidos: [] }),
  obtenerConfigAbastecimientoService: vi.fn().mockResolvedValue([]),
  actualizarConfigAbastecimientoService: vi.fn().mockResolvedValue(true),
  transformarPageItemAProducto: (item: any) => ({
    id: item.idProducto?.toString() ?? item.id ?? '0',
    nombre: item.nombre ?? 'Sin nombre',
    categoria: item.categoria ?? 'Sin categoría',
    unidadMedida: item.unidadMedida ?? 'Sin unidad',
    stock: item.stock ?? 0,
    stockMinimo: item.stockMinimo ?? 0,
  }),
}));

vi.mock('../../services/inventario/producto-service', () => ({
  obtenerProductosPaginadosService: mockObtenerProductosPaginados,
  buscarProductosService: mockBuscarProductos,
  buscarProductosPorCodigoService: mockBuscarPorCodigo,
  obtenerFiltrosInventarioService: mockObtenerFiltros,
  crearProductoService: vi.fn(),
  actualizarProductoService: vi.fn(),
  eliminarProductoService: vi.fn(),
  softDeleteInventarioService: vi.fn(),
  transformarPageItemAProducto: (item: any) => ({
    id: item.idProducto?.toString() ?? item.id ?? '0',
    nombre: item.nombre ?? 'Sin nombre',
    categoria: item.categoria ?? 'Sin categoría',
    unidadMedida: item.unidadMedida ?? 'Sin unidad',
    stock: item.stock ?? 0,
    stockMinimo: item.stockMinimo ?? 0,
  }),
}));

vi.mock('../../services/inventario/categoria-service', () => ({
  obtenerCategoriasActivasService: mockObtenerCategorias,
}));

vi.mock('../../services/inventario/unidad-medida-service', () => ({
  obtenerUnidadesActivasService: mockObtenerUnidades,
}));

// ============================================
// RENDERIZADOR CON CONTEXTOS
// ============================================
const renderWithRoute = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/movimientos${search}`]}>
      <HeroUIProvider disableAnimation={true}>
        <InventarioPage />
      </HeroUIProvider>
    </MemoryRouter>
  );

// ============================================
// DATOS DE PRUEBA
// ============================================
const movEntrada = {
  nombreProducto: 'Harina de Trigo',
  nombreCategoria: 'Abarrotes',
  tipoMovimiento: 'ENTRADA_INVENTARIO',
  stockMovimiento: 25,
  fechaMovimiento: '2026-06-16T10:00:00',
  nombreUsuario: 'Bodeguero Test',
  observacion: 'Compra semanal',
};

const movSalida = {
  nombreProducto: 'Azúcar Flor',
  nombreCategoria: 'Abarrotes',
  tipoMovimiento: 'SALIDA_BODEGA',
  stockMovimiento: 5,
  fechaMovimiento: '2026-06-16T12:00:00',
  nombreUsuario: 'Bodeguero Test',
  observacion: '',
};

const respuestaConDatos = {
  content: [movEntrada, movSalida],
  pagination: { page: 1, limit: 20, offset: 0, totalPages: 1 },
};

const respuestaVacia = {
  content: [],
  pagination: { page: 1, limit: 20, offset: 0, totalPages: 1 },
};

// ============================================
// SUITE
// ============================================
describe('InventarioPage — pestaña Movimientos (fusión de movimientos-producto.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'admin@duoc.cl', nombre: 'Admin Test', rol: 'Administrador' },
      isAuthenticated: true, isLoading: false,
      login: vi.fn(), logout: vi.fn(),
      canAccessPage: vi.fn(() => true), userRole: null,
    } as any);

    vi.spyOn(permissionContext, 'useModulePermission').mockReturnValue({
      canRead: true, canCreate: true, canUpdate: true, canDelete: true,
    } as any);

    mockFindMovimientos.mockResolvedValue(respuestaConDatos);
    mockObtenerProductosPaginados.mockResolvedValue({ items: [], page: 1, pageSize: 40, totalPages: 0, totalItems: 0 });
    mockObtenerFiltros.mockResolvedValue({ categorias: [], unidades: [] });
    mockObtenerCategorias.mockResolvedValue([{ id: '1', nombre: 'Categoría 1' }]);
    mockObtenerUnidades.mockResolvedValue([{ id: '1', nombre: 'unidad', abreviatura: 'u' }]);
    mockBuscarProductos.mockResolvedValue({ items: [], page: 1, pageSize: 40, totalPages: 0, totalItems: 0 });
    mockBuscarPorCodigo.mockResolvedValue({ items: [], page: 1, pageSize: 40, totalPages: 0, totalItems: 0 });
    mockObtenerBulkProductos.mockResolvedValue({ items: [], total: 0 });
  });

  afterEach(() => cleanup());

  // BIM-00
  it('BIM-00: entrar por /movimientos abre la página en la pestaña Movimientos', async () => {
    renderWithRoute();
    await waitFor(() => expect(mockFindMovimientos).toHaveBeenCalled());
    // La pestaña Stock no debe estar montada -- confirma que no quedaron ambas pestañas visibles a la vez.
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });

  // BIM-01
  it('BIM-01: llama a findMovimientosConFiltros con page 1 y tipo TODOS al montar', async () => {
    renderWithRoute();
    await waitFor(() => expect(mockFindMovimientos).toHaveBeenCalled());
    expect(mockFindMovimientos).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, tipoMovimiento: 'TODOS', orden: 'MAS_RECIENTES' })
    );
  });

  // BIM-02
  it('BIM-02: renderiza los movimientos recibidos en la tabla', async () => {
    renderWithRoute();
    await waitFor(() => expect(screen.getByText('Harina de Trigo')).toBeInTheDocument());
    expect(screen.getByText('Azúcar Flor')).toBeInTheDocument();
  });

  // BIM-03
  it('BIM-03: muestra el empty state cuando no hay movimientos', async () => {
    mockFindMovimientos.mockResolvedValue(respuestaVacia);
    renderWithRoute();
    await waitFor(() =>
      expect(screen.getByText('No se encontraron movimientos')).toBeInTheDocument()
    );
  });

  // BIM-04
  it('BIM-04: muestra el contador de movimientos cargados', async () => {
    renderWithRoute();
    await waitFor(() => expect(screen.getByText(/2 movimiento\(s\) cargado\(s\)/)).toBeInTheDocument());
  });

  // BIM-05
  it('BIM-05: toma el query param ?nombre= como filtro inicial de producto', async () => {
    renderWithRoute('?nombre=Harina');
    await waitFor(() => expect(mockFindMovimientos).toHaveBeenCalled());
    expect(mockFindMovimientos).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, nombreProducto: 'Harina' })
    );
  });

  // BIM-06
  it('BIM-06: traduce el tipo de movimiento a una etiqueta legible en la fila', async () => {
    renderWithRoute();
    await waitFor(() => expect(screen.getByText('Harina de Trigo')).toBeInTheDocument());
    const etiquetasEntrada = screen.getAllByText('Entrada Inventario');
    expect(etiquetasEntrada.some(el => el.tagName.toLowerCase() === 'b')).toBe(true);
    const etiquetasSalida = screen.getAllByText('Salida Bodega');
    expect(etiquetasSalida.some(el => el.tagName.toLowerCase() === 'b')).toBe(true);
  });
});
