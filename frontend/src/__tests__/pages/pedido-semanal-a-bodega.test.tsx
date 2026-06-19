import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import PedidoSemanalABodegaPage, { FormularioReceta } from '../../pages/pedido-semanal-a-bodega';
import * as authContext from '../../contexts/auth-context';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// HOISTED: disponibles antes del hoisting de vi.mock
// ============================================

const {
  mockToastWarning, mockToastSuccess, mockToastError,
  mockObtenerPaginados, mockObtenerCounts, mockObtenerAsignaturas,
  mockBuscarPaginados, mockCambiarEstado, mockCrearConDetalles,
  mockActualizarConDetalles, mockSoftDelete, mockObtenerProductos,
} = vi.hoisted(() => ({
  mockToastWarning:        vi.fn(),
  mockToastSuccess:        vi.fn(),
  mockToastError:          vi.fn(),
  mockObtenerPaginados:    vi.fn(),
  mockObtenerCounts:       vi.fn(),
  mockObtenerAsignaturas:  vi.fn(),
  mockBuscarPaginados:     vi.fn(),
  mockCambiarEstado:       vi.fn(),
  mockCrearConDetalles:    vi.fn(),
  mockActualizarConDetalles: vi.fn(),
  mockSoftDelete:          vi.fn(),
  mockObtenerProductos:    vi.fn(),
}));

// ============================================
// MOCKS DE LIBRERÍAS EXTERNAS
// ============================================

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('xlsx', () => ({
  read: vi.fn(() => ({ SheetNames: ['Hoja1'] })),
  utils: { sheet_to_json: vi.fn(() => []) },
}));

// ============================================
// MOCKS DE HOOKS
// ============================================

vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error:   mockToastError,
    warning: mockToastWarning,
    info:    vi.fn(),
  }),
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

// ============================================
// MOCKS DE CONTEXTOS
// ============================================

vi.mock('../../contexts/periodo-semana-context', () => ({
  usePeriodoSemana: () => ({
    periodos:          [],
    semanas:           [],
    periodo:           null,
    defaultSemanaId:   null,
    isLoading:         false,
    seleccionarPeriodo: vi.fn(),
    seleccionarSemana:  vi.fn(),
  }),
}));

// ============================================
// MOCKS DE SERVICIOS
// ============================================

vi.mock('../../services/pedido-semanal-bodega-service', () => ({
  obtenerRecetasPaginadasService:       mockObtenerPaginados,
  obtenerRecetasCountService:           mockObtenerCounts,
  obtenerAsignaturasActivasService:     mockObtenerAsignaturas,
  buscarRecetasPaginadasService:        mockBuscarPaginados,
  cambiarEstadoRecetaService:           mockCambiarEstado,
  crearRecetaConDetallesService:        mockCrearConDetalles,
  actualizarRecetaConDetallesService:   mockActualizarConDetalles,
  softDeleteRecetaService:              mockSoftDelete,
  crearRecetaService:                   vi.fn(),
  actualizarRecetaService:              vi.fn(),
  eliminarRecetaService:                vi.fn(),
  importarExcelPedidoService:           vi.fn().mockResolvedValue({ totalOk: 0, totalNoEncontrados: 0, resultados: [] }),
}));

vi.mock('../../services/producto-service', () => ({
  obtenerProductosParaRecetaService: mockObtenerProductos,
}));

vi.mock('../../utils/request-throttle', () => ({
  parallelWithLimit: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../components/BookPageLoader', () => ({
  default: () => <div data-testid="book-loader">Cargando...</div>,
}));

// ============================================
// DATOS DE PRUEBA
// ============================================

const pedidoActivo = {
  idPedidoSemanaBodega: 1,
  nombrePedido:         'Pedido Test Semana 1',
  descripcionPedido:    'Descripción de prueba',
  estadoPedido:         'Activo' as const,
  detalles:             [],
  totalDetalles:        0,
  idSemana:             null,
  idAsignatura:         null,
};

const paginaVacia    = { content: [], paging: { totalPages: 0 } };
const paginaConItem  = { content: [pedidoActivo], paging: { totalPages: 1 } };
const countsCero     = { totalPedidos: 0, total_activos: 0, total_inactivos: 0 };
const countsConItem  = { totalPedidos: 1, total_activos: 1, total_inactivos: 0 };

// ============================================
// RENDERIZADOR
// ============================================

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <BrowserRouter>
      <HeroUIProvider disableAnimation={true}>
        {component}
      </HeroUIProvider>
    </BrowserRouter>
  );

// ============================================
// HELPERS
// ============================================

const mockAdmin = () =>
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: 1, email: 'admin@kuhub.cl', nombre: 'Admin', rol: 'Administrador' },
    isAuthenticated: true,
    isLoading: false,
    login:         vi.fn(),
    logout:        vi.fn(),
    canAccessPage: vi.fn(() => true),
    userRole:      null,
  } as any);

const mockPermissions = (canCreate = true, canEdit = true, canInactivar = true, canDelete = true) =>
  vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
    canAccess: vi.fn((modulo: string) => {
      if (modulo === 'PEDIDO_SEM_CREAR')    return canCreate;
      if (modulo === 'PEDIDO_SEM_EDITAR')   return canEdit;
      if (modulo === 'PEDIDO_SEM_INACTIVAR') return canInactivar;
      if (modulo === 'PEDIDO_SEM_ELIMINAR') return canDelete;
      return false;
    }),
  } as any);

const waitForLoad = () =>
  waitFor(() => expect(screen.queryByTestId('book-loader')).not.toBeInTheDocument(), { timeout: 3000 });

// ============================================
// SUITE: PedidoSemanalABodegaPage — Permisos
// ============================================

describe('PedidoSemanalABodegaPage — Permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockObtenerPaginados.mockResolvedValue(paginaVacia);
    mockObtenerCounts.mockResolvedValue(countsCero);
    mockObtenerAsignaturas.mockResolvedValue([]);
    mockObtenerProductos.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('PS-13: rol sin permiso CREAR no muestra el botón "Nuevo Pedido Semanal"', async () => {
    // Arrange
    mockPermissions(false, false, false, false);

    // Act
    renderWithProviders(<PedidoSemanalABodegaPage />);
    await waitForLoad();

    // Assert
    expect(screen.queryByText('Nuevo Pedido Semanal')).not.toBeInTheDocument();
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
  });

  it('PS-13b: rol con permiso CREAR muestra el botón "Nuevo Pedido Semanal"', async () => {
    // Arrange
    mockPermissions(true, false, false, false);

    // Act
    renderWithProviders(<PedidoSemanalABodegaPage />);
    await waitForLoad();

    // Assert
    expect(screen.getByText('Nuevo Pedido Semanal')).toBeInTheDocument();
  });

  it('PS-14: rol solo lectura tiene los botones de acción deshabilitados', async () => {
    // Arrange
    mockPermissions(false, false, false, false);
    mockObtenerPaginados.mockResolvedValue(paginaConItem);
    mockObtenerCounts.mockResolvedValue(countsConItem);

    // Act
    renderWithProviders(<PedidoSemanalABodegaPage />);
    await waitForLoad();

    // Assert — los tres botones de acción de la fila deben estar deshabilitados
    const buttons = screen.getAllByRole('button');
    const actionButtons = buttons.filter(b => b.closest('td'));
    actionButtons.forEach(btn => {
      expect(btn).toHaveAttribute('data-disabled', 'true');
    });
  });
});

// ============================================
// SUITE: PedidoSemanalABodegaPage — Filtros
// ============================================

describe('PedidoSemanalABodegaPage — Filtros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissions();
    mockObtenerPaginados.mockResolvedValue(paginaVacia);
    mockObtenerCounts.mockResolvedValue(countsCero);
    mockObtenerAsignaturas.mockResolvedValue([]);
    mockObtenerProductos.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('PS-12: al presionar el card "Activos", el servicio se llama con estadoFilter=ACTIVO', async () => {
    // Arrange
    renderWithProviders(<PedidoSemanalABodegaPage />);
    await waitForLoad();
    const llamadasIniciales = mockObtenerPaginados.mock.calls.length;

    // Act — clic en el card "Activos"
    const cardActivos = screen.getByText('Activos').closest('[data-pressable="true"], button, [role="button"]')
                        ?? screen.getByText('Activos').closest('div[class*="Card"]')
                        ?? screen.getByText('Activos').parentElement!;
    fireEvent.click(cardActivos);

    // Assert — se hace una nueva llamada con el estadoFilter='ACTIVO'
    await waitFor(() => {
      const calls = mockObtenerPaginados.mock.calls;
      expect(calls.length).toBeGreaterThan(llamadasIniciales);
      const lastCall = calls[calls.length - 1];
      // Parámetro estadoFilter es el 4.° argumento (índice 3)
      expect(lastCall[3]).toBe('ACTIVO');
    });
  });
});

// ============================================
// SUITE: PedidoSemanalABodegaPage — Toggle Estado
// ============================================

describe('PedidoSemanalABodegaPage — Toggle Estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissions(true, true, true, true);
    mockObtenerPaginados.mockResolvedValue(paginaConItem);
    mockObtenerCounts.mockResolvedValue(countsConItem);
    mockObtenerAsignaturas.mockResolvedValue([]);
    mockObtenerProductos.mockResolvedValue([]);
    mockCambiarEstado.mockResolvedValue(true);
  });
  afterEach(cleanup);

  it('PS-11: al inactivar un pedido activo, el chip cambia a Inactivo y el contador se actualiza', async () => {
    // Arrange
    renderWithProviders(<PedidoSemanalABodegaPage />);
    await waitForLoad();

    // El chip "Activo" debe existir en la tabla
    expect(screen.getByText('Activo')).toBeInTheDocument();

    // Act — los 3 botones de acción están dentro de <td> (Editar=0, Inactivar=1, Eliminar=2)
    const actionButtons = screen.getAllByRole('button').filter(b => b.closest('td') !== null);
    const inactivarBtn = actionButtons[1];
    expect(inactivarBtn).toBeDefined();

    fireEvent.click(inactivarBtn);

    // Assert — el servicio fue invocado y el DOM actualiza el chip
    await waitFor(() => {
      expect(mockCambiarEstado).toHaveBeenCalledWith('1');
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ============================================
// SUITE: FormularioReceta — Validaciones
// ============================================

const periodoContextDefault = {
  periodos:           [],
  semanas:            [],
  periodo:            null,
  defaultSemanaId:    null,
  isLoading:          false,
  seleccionarPeriodo: vi.fn(),
  seleccionarSemana:  vi.fn(),
};

const renderFormulario = (props: Partial<React.ComponentProps<typeof FormularioReceta>> = {}) => {
  const defaults = {
    receta:             null,
    mode:               'crear' as const,
    productos:          [],
    onSave:             vi.fn(),
    onValidationChange: vi.fn(),
    history:            { push: vi.fn() },
    isAdmin:            false,
  };
  return renderWithProviders(
    <FormularioReceta ref={null} {...defaults} {...props} />
  );
};

describe('FormularioReceta — Validaciones de formulario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissions();
  });
  afterEach(cleanup);

  it('PS-01: nombre vacío → onValidationChange se llama con false', () => {
    // Arrange + Act
    const onValidationChange = vi.fn();
    renderFormulario({ onValidationChange });

    // Assert — sin nombre ni ingredientes, el formulario no es válido
    expect(onValidationChange).toHaveBeenCalledWith(false);
  });

  it('PS-02: sin ingredientes → onValidationChange(false) aunque nombre sea válido', () => {
    // Arrange
    const onValidationChange = vi.fn();
    renderFormulario({ onValidationChange });

    // Act — escribir nombre válido en el input
    const input = screen.getByPlaceholderText(/Pan Amasado/i);
    fireEvent.change(input, { target: { value: 'Pedido Semana 1' } });

    // Assert — sigue sin ingredientes, entonces sigue inválido
    const lastCall = onValidationChange.mock.calls[onValidationChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe(false);
  });

  it('PS-04: el input de nombre tiene maxLength=100', () => {
    // Arrange + Act
    renderFormulario();

    // Assert
    const input = screen.getByPlaceholderText(/Pan Amasado/i);
    expect(input).toHaveAttribute('maxlength', '100');
  });
});

// ============================================
// SUITE: FormularioReceta — Formato es-CL (Cantidades)
// ============================================

describe('FormularioReceta — Formato es-CL en cantidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissions();
  });
  afterEach(cleanup);

  const agregarIngrediente = () => {
    // El card de "agregar ingrediente" aparece cuando ingredientes=[]
    const addCard = screen.getByText(/Click aquí para agregar el primero/i).closest('[data-pressable="true"]')
                   ?? screen.getByText(/Click aquí para agregar el primero/i).closest('[tabindex]')
                   ?? screen.getByText(/Click aquí para agregar el primero/i);
    fireEvent.click(addCard);
  };

  it('PS-16: escribir "1500" en cantidad muestra "1.500" (punto de miles es-CL)', () => {
    // Arrange
    renderFormulario();
    agregarIngrediente();

    // Act — encontrar input de cantidad por placeholder
    const qtyInput = screen.getByPlaceholderText('Ej: 1500,5');
    fireEvent.change(qtyInput, { target: { value: '1500' } });

    // Assert
    expect(qtyInput).toHaveValue('1.500');
  });

  it('PS-17: escribir "1500,5" en cantidad muestra "1.500,5" (coma decimal es-CL)', () => {
    // Arrange
    renderFormulario();
    agregarIngrediente();

    // Act
    const qtyInput = screen.getByPlaceholderText('Ej: 1500,5');
    // Simular escritura paso a paso: primero '1500' luego '1500,'  luego '1500,5'
    fireEvent.change(qtyInput, { target: { value: '1500' } });
    fireEvent.change(qtyInput, { target: { value: '1500,' } });
    fireEvent.change(qtyInput, { target: { value: '1500,5' } });

    // Assert
    expect(qtyInput).toHaveValue('1.500,5');
  });

  it('PS-05: escribir 4 decimales rechaza el último dígito', () => {
    // Arrange
    renderFormulario();
    agregarIngrediente();

    const qtyInput = screen.getByPlaceholderText('Ej: 1500,5');
    fireEvent.change(qtyInput, { target: { value: '1,500' } });
    const valorTresDecimales = (qtyInput as HTMLInputElement).value;

    // Act — intentar escribir un 4.° decimal
    fireEvent.change(qtyInput, { target: { value: '1,5000' } });

    // Assert — el valor no cambia
    expect(qtyInput).toHaveValue(valorTresDecimales);
  });

  it('PS-06: cantidad mayor a 9999999 muestra toast warning y se topa al máximo', () => {
    // Arrange
    renderFormulario();
    agregarIngrediente();

    // Act
    const qtyInput = screen.getByPlaceholderText('Ej: 1500,5');
    fireEvent.change(qtyInput, { target: { value: '10000000' } });

    // Assert
    expect(mockToastWarning).toHaveBeenCalledWith(
      expect.stringContaining('9.999.999')
    );
    expect(qtyInput).toHaveValue('9.999.999,999');
  });
});

// ============================================
// SUITE: FormularioReceta — Controles de UI
// ============================================

describe('FormularioReceta — Controles de UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissions();
  });
  afterEach(cleanup);

  it('PS-19: "Limpiar todo" vacía la lista de ingredientes', async () => {
    // Arrange
    renderFormulario();
    // Agregar primer ingrediente
    const addCard = screen.getByText(/Click aquí para agregar el primero/i);
    fireEvent.click(addCard);
    // Verificar que apareció el ingrediente
    expect(screen.getByPlaceholderText('Ej: 1500,5')).toBeInTheDocument();

    // Act — click en "Limpiar todo"
    const limpiarBtn = screen.getByText('Limpiar todo');
    fireEvent.click(limpiarBtn);

    // Assert — el ingrediente desaparece, vuelve el mensaje inicial
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Ej: 1500,5')).not.toBeInTheDocument();
      expect(screen.getByText('Agrega al menos un ingrediente')).toBeInTheDocument();
    });
  });

  it('PS-20: toggle de vista cambia entre tarjetas y tabla', () => {
    // Arrange
    renderFormulario();
    const addCard = screen.getByText(/Click aquí para agregar el primero/i);
    fireEvent.click(addCard);

    // Estado inicial: vista tarjetas (texto "¿Necesitas añadir algo más?" o card de add visible)
    // El toggle es un botón icono al lado de "Ingredientes"
    const toggleBtn = screen.getByTitle(/Ver como tabla|Ver como tarjetas/i);
    expect(toggleBtn).toBeInTheDocument();

    // Act — cambiar a vista tabla
    fireEvent.click(toggleBtn);

    // Assert — la tabla con columnas aparece
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.getByText('Cantidad')).toBeInTheDocument();

    // Act — volver a vista tarjetas
    fireEvent.click(toggleBtn);

    // Assert — las columnas de tabla ya no están
    expect(screen.queryByRole('columnheader', { name: '#' })).not.toBeInTheDocument();
  });
});
