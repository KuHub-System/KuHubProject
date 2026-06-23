import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import InventarioPage, { FormularioProducto } from '../../pages/inventario';
import * as authContext from '../../contexts/auth-context';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// HOISTED: disponibles antes del hoisting de vi.mock
// ============================================

const {
  mockToastWarning, mockToastSuccess, mockToastError,
  mockObtenerProductosPaginados, mockObtenerFiltros,
  mockObtenerCategorias, mockObtenerUnidades,
  mockBuscarProductos, mockBuscarPorCodigo,
  mockObtenerBulkProductos, mockCrearProducto,
  mockActualizarProducto, mockSoftDelete,
} = vi.hoisted(() => ({
  mockToastWarning: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockObtenerProductosPaginados: vi.fn(),
  mockObtenerFiltros: vi.fn(),
  mockObtenerCategorias: vi.fn(),
  mockObtenerUnidades: vi.fn(),
  mockBuscarProductos: vi.fn(),
  mockBuscarPorCodigo: vi.fn(),
  mockObtenerBulkProductos: vi.fn(),
  mockCrearProducto: vi.fn(),
  mockActualizarProducto: vi.fn(),
  mockSoftDelete: vi.fn(),
}));

// ============================================
// RENDERIZADOR CON CONTEXTOS
// ============================================

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {/* Añadir disableAnimation={true} evita que HeroUI congele los tests */}
      <HeroUIProvider disableAnimation={true}>
        {component}
      </HeroUIProvider>
    </BrowserRouter>
  );
};

// ============================================
// MOCKS DE LIBRERÍAS EXTERNAS
// ============================================

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    // Interceptamos los motion.div y removemos las props de animación para que React no falle
    div: ({ initial, animate, exit, transition, children, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// ============================================
// MOCKS DE MÓDULOS
// ============================================

vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../../hooks/useToast', () => {
  // Objeto estable: misma referencia en cada render, evita que cargarProductosPaginados
  // se recree por cambio de referencia de `toast` (dep de useCallback).
  const toastInstance = {
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
    info: vi.fn(),
  };
  return {
    useToast: () => toastInstance,
    useConfirm: () => vi.fn(),
  };
});

vi.mock('../../services/storage-service', () => ({
  obtenerCategorias: vi.fn().mockReturnValue([{ id: 1, nombre: 'Categoría 1' }]),
  obtenerUnidades: vi.fn().mockReturnValue([{ id: 1, nombre: 'unidad' }]),
}));

vi.mock('../../services/bodega-transito-service', () => ({
  actualizarBodegaTransitoConProductoService: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/solicitud-service', () => ({
  obtenerProyeccionAbastecimientoService: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../components/modals/GestionCategoriasModal', () => ({ default: () => null }));
vi.mock('../../components/modals/GestionUnidadesModal', () => ({ default: () => null }));

vi.mock('../../services/inventario-service', () => ({
  obtenerBulkProductoInventoryListingService: mockObtenerBulkProductos,
  bulkUpdateInventoryStockService: vi.fn().mockResolvedValue({ exitosos: [], fallidos: [] }),
  obtenerConfigAbastecimientoService: vi.fn().mockResolvedValue([]),
  actualizarConfigAbastecimientoService: vi.fn().mockResolvedValue(true),
  transformarPageItemAProducto: (item: any) => ({
    id: item.idProducto?.toString() ?? item.id ?? '0',
    nombre: item.nombre ?? 'Sin nombre',
    descripcion: item.descripcion ?? '',
    codProducto: item.codProducto,
    categoria: item.categoria ?? 'Sin categoría',
    unidadMedida: item.unidadMedida ?? 'Sin unidad',
    stock: item.stock ?? 0,
    stockMinimo: item.stockMinimo ?? 0,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    _idInventario: item._idInventario,
  }),
}));

vi.mock('../../services/producto-service', () => ({
  obtenerProductosPaginadosService: mockObtenerProductosPaginados,
  buscarProductosService: mockBuscarProductos,
  buscarProductosPorCodigoService: mockBuscarPorCodigo,
  obtenerFiltrosInventarioService: mockObtenerFiltros,
  crearProductoService: mockCrearProducto,
  actualizarProductoService: mockActualizarProducto,
  eliminarProductoService: vi.fn(),
  softDeleteInventarioService: mockSoftDelete,
  transformarPageItemAProducto: (item: any) => ({
    id: item.idProducto?.toString() ?? item.id ?? '0',
    nombre: item.nombre ?? 'Sin nombre',
    descripcion: item.descripcion ?? '',
    codProducto: item.codProducto,
    categoria: item.categoria ?? 'Sin categoría',
    unidadMedida: item.unidadMedida ?? 'Sin unidad',
    stock: item.stock ?? 0,
    stockMinimo: item.stockMinimo ?? 0,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    _idInventario: item._idInventario,
  }),
}));

vi.mock('../../services/categoria-service', () => ({
  obtenerCategoriasActivasService: mockObtenerCategorias,
}));

vi.mock('../../services/unidad-medida-service', () => ({
  obtenerUnidadesActivasService: mockObtenerUnidades,
}));

// ============================================
// DATOS DE PRUEBA
// ============================================

const categoriasMock = [{ id: 1, nombre: 'Categoría 1' }];
const unidadesMock = [{ id: '1', nombre: 'unidad', abreviatura: 'u' }] as any[];

const productoConStock = {
  id: '1', idProducto: 1, nombre: 'Arroz Premium', codProducto: 'P001',
  descripcion: 'Arroz grano largo', stock: 100, stockMinimo: 10,
  categoria: 'Categoría 1', unidadMedida: 'unidad', _idInventario: 1,
};

const productoSinStock = {
  id: '2', idProducto: 2, nombre: 'Harina de Trigo', codProducto: 'P002',
  descripcion: 'Harina multipropósito', stock: 0, stockMinimo: 5,
  categoria: 'Categoría 1', unidadMedida: 'kg', _idInventario: 2,
};

// ============================================
// SUITE DE TESTS: InventarioPage
// ============================================

describe('InventarioPage', () => {
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

    mockObtenerProductosPaginados.mockResolvedValue({
      items: [productoConStock, productoSinStock],
      page: 1, pageSize: 40, totalPages: 1, totalItems: 2,
    });
    mockObtenerFiltros.mockResolvedValue({
      categorias: [{ id: 1, nombre: 'Categoría 1' }],
      unidades: [{ id: 1, nombre: 'unidad' }],
    });
    mockObtenerCategorias.mockResolvedValue([{ id: '1', nombre: 'Categoría 1' }]);
    mockObtenerUnidades.mockResolvedValue([{ id: '1', nombre: 'unidad', abreviatura: 'u' }]);
    mockBuscarProductos.mockResolvedValue({ items: [], page: 1, pageSize: 40, totalPages: 0, totalItems: 0 });
    mockBuscarPorCodigo.mockResolvedValue({ items: [], page: 1, pageSize: 40, totalPages: 0, totalItems: 0 });
    mockObtenerBulkProductos.mockResolvedValue({ items: [], total: 0 });
  });

  // ============================================
  // TEST 01: Llama servicio de filtros al montar
  // ============================================
  it('INV-01: llama a obtenerFiltrosInventarioService al montar', async () => {
    // ARRANGE
    renderWithProviders(<InventarioPage />);

    // ACT & ASSERT
    await waitFor(() => {
      expect(mockObtenerFiltros).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 02: Llama servicio de productos con page=1
  // ============================================
  it('INV-02: carga inicial de productos llama al servicio con page 1', async () => {
    // ARRANGE
    renderWithProviders(<InventarioPage />);

    // ACT & ASSERT
    await waitFor(() => {
      expect(mockObtenerProductosPaginados).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  // ============================================
  // TEST 03: Llama servicio de categorías activas
  // ============================================
  it('INV-03: carga el catálogo de categorías activas al montar', async () => {
    // ARRANGE
    renderWithProviders(<InventarioPage />);

    // ACT & ASSERT
    await waitFor(() => {
      expect(mockObtenerCategorias).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 04: Llama servicio de unidades activas
  // ============================================
  it('INV-04: carga el catálogo de unidades activas al montar', async () => {
    // ARRANGE
    renderWithProviders(<InventarioPage />);

    // ACT & ASSERT
    await waitFor(() => {
      expect(mockObtenerUnidades).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 05: Botón "Nuevo" visible con permiso de crear
  // ============================================
  it('INV-05: muestra el botón "Nuevo" con permiso de crear', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<InventarioPage />);
    await waitFor(() => expect(mockObtenerProductosPaginados).toHaveBeenCalled());

    // ACT
    const nuevoBtn = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.trim() === 'Nuevo');

    // ASSERT
    expect(nuevoBtn).toBeTruthy();
  });

  // ============================================
  // TEST 06: Botón "Control Masivo" visible con permiso de crear
  // ============================================
  it('INV-06: muestra el botón "Control Masivo" con permiso de crear', async () => {
    // ARRANGE
    const { container } = renderWithProviders(<InventarioPage />);
    await waitFor(() => expect(mockObtenerProductosPaginados).toHaveBeenCalled());

    // ACT
    const masivoBtn = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Control Masivo'));

    // ASSERT
    expect(masivoBtn).toBeTruthy();
  });

  // ============================================
  // TEST 07: Error al obtener productos
  // ============================================
  it('INV-07: maneja error al obtener productos paginados sin romper la página', async () => {
    // ARRANGE
    mockObtenerProductosPaginados.mockRejectedValueOnce(new Error('Error de conexión'));

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerProductosPaginados).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 08: Error al obtener filtros
  // ============================================
  it('INV-08: maneja error al obtener filtros sin romper la página', async () => {
    // ARRANGE
    mockObtenerFiltros.mockRejectedValueOnce(new Error('Error de conexión'));

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerFiltros).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 09: Error al obtener categorías
  // ============================================
  it('INV-09: maneja error al obtener categorías sin romper la página', async () => {
    // ARRANGE
    mockObtenerCategorias.mockRejectedValueOnce(new Error('Error de conexión'));

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerCategorias).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 10: Error al obtener unidades
  // ============================================
  it('INV-10: maneja error al obtener unidades sin romper la página', async () => {
    // ARRANGE
    mockObtenerUnidades.mockRejectedValueOnce(new Error('Error de conexión'));

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerUnidades).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 11: Recuperación después de error en productos
  // ============================================
  it('INV-11: se recupera tras error en productos en el segundo intento', async () => {
    // ARRANGE — primer intento falla, segundo resuelve correctamente
    mockObtenerProductosPaginados
      .mockRejectedValueOnce(new Error('Error al cargar'))
      .mockResolvedValueOnce({
        items: [productoConStock],
        page: 1, pageSize: 40, totalPages: 1, totalItems: 1,
      });

    // ACT
    renderWithProviders(<InventarioPage />);

    // Esperar primer intento fallido
    await waitFor(() => expect(mockObtenerProductosPaginados).toHaveBeenCalledTimes(1));

    // Disparar reload via evento global (mismo mecanismo que usa la página al actualizar).
    // act() síncrono para flush del setCache(); waitFor maneja el resto async.
    act(() => {
      window.dispatchEvent(new CustomEvent('productosActualizados'));
    });

    // ASSERT — segundo intento resuelve y el producto se muestra
    await waitFor(() => expect(mockObtenerProductosPaginados).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Arroz Premium')).toBeInTheDocument();
  });

  // ============================================
  // TEST 12: Resultado vacío sin productos
  // ============================================
  it('INV-12: página sin productos (resultado vacío) se renderiza sin errores', async () => {
    // ARRANGE
    mockObtenerProductosPaginados.mockResolvedValueOnce({
      items: [],
      page: 1, pageSize: 40, totalPages: 0, totalItems: 0,
    });

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT — servicio invocado y ningún producto en DOM
    await waitFor(() => expect(mockObtenerProductosPaginados).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Arroz Premium')).not.toBeInTheDocument();
    expect(screen.queryByText('Harina de Trigo')).not.toBeInTheDocument();
  });

  // ============================================
  // TEST 13: Múltiples productos cargados
  // ============================================
  it('INV-13: carga de múltiples productos invoca el servicio con page 1 y los muestra', async () => {
    // ARRANGE — múltiples productos
    const variosProductos = [
      productoConStock,
      productoSinStock,
      { ...productoConStock, id: '3', nombre: 'Azúcar' },
    ];

    mockObtenerProductosPaginados.mockResolvedValueOnce({
      items: variosProductos,
      page: 1, pageSize: 40, totalPages: 1, totalItems: 3,
    });

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT — servicio con page 1 y productos visibles en el DOM
    await waitFor(() =>
      expect(mockObtenerProductosPaginados).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      )
    );
    expect(screen.getByText('Arroz Premium')).toBeInTheDocument();
    expect(screen.getByText('Harina de Trigo')).toBeInTheDocument();
  });

});
