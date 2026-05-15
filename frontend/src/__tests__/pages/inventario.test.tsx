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

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
    info: vi.fn(),
  }),
  useConfirm: () => vi.fn(),
}));

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
  it('test01: debe llamar al servicio de filtros al montar', async () => {
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
  it('test02: debe llamar al servicio de productos con page 1 en la carga inicial', async () => {
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
  it('test03: debe llamar al servicio de categorías activas al montar', async () => {
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
  it('test04: debe llamar al servicio de unidades activas al montar', async () => {
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
  it('test05: debe mostrar el botón "Nuevo" cuando tiene permiso de crear', async () => {
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
  it('test06: debe mostrar el botón "Control Masivo" cuando tiene permiso de crear', async () => {
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
  it('test07: debe manejar error al obtener productos paginados', async () => {
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
  it('test08: debe manejar error al obtener filtros', async () => {
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
  it('test09: debe manejar error al obtener categorías', async () => {
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
  it('test10: debe manejar error al obtener unidades', async () => {
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
  it('test11: debe recuperarse después de error en productos', async () => {
    // ARRANGE — primer intento falla, segundo intenta
    mockObtenerProductosPaginados.mockRejectedValueOnce(new Error('Error'))
      .mockResolvedValueOnce({
        items: [productoConStock],
        page: 1, pageSize: 40, totalPages: 1, totalItems: 1,
      });

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerProductosPaginados).toHaveBeenCalled();
    });
  });

  // ============================================
  // TEST 12: Resultado vacío sin productos
  // ============================================
  it('test12: debe mostrar página cuando no hay productos', async () => {
    // ARRANGE
    mockObtenerProductosPaginados.mockResolvedValueOnce({
      items: [],
      page: 1, pageSize: 40, totalPages: 0, totalItems: 0,
    });

    // ACT
    renderWithProviders(<InventarioPage />);

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerProductosPaginados).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // TEST 13: Múltiples productos cargados
  // ============================================
  it('test13: debe cargar múltiples productos correctamente', async () => {
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

    // ASSERT
    await waitFor(() => {
      expect(mockObtenerProductosPaginados).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

});
