import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import MovimientosProductoPage from '../../pages/movimientos-producto';

// ============================================
// HOISTED: disponibles antes del hoisting de vi.mock
// ============================================
const { mockFindMovimientos } = vi.hoisted(() => ({
  mockFindMovimientos: vi.fn(),
}));

// ============================================
// MOCKS
// ============================================
vi.mock('../../hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));

vi.mock('../../services/movimiento-service', () => ({
  findMovimientosConFiltros: mockFindMovimientos,
}));

// ============================================
// RENDERIZADOR CON CONTEXTOS
// ============================================
const renderWithRoute = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/movimientos${search}`]}>
      <HeroUIProvider disableAnimation={true}>
        <MovimientosProductoPage />
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
describe('MovimientosProductoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMovimientos.mockResolvedValue(respuestaConDatos);
  });

  afterEach(() => cleanup());

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
    // El label aparece tanto en la celda de la tabla (<b>) como en las opciones del Select,
    // por eso se valida la celda en negrita renderizada por renderTipoMovimiento.
    await waitFor(() => expect(screen.getByText('Harina de Trigo')).toBeInTheDocument());
    const etiquetasEntrada = screen.getAllByText('Entrada Inventario');
    expect(etiquetasEntrada.some(el => el.tagName.toLowerCase() === 'b')).toBe(true);
    const etiquetasSalida = screen.getAllByText('Salida Bodega');
    expect(etiquetasSalida.some(el => el.tagName.toLowerCase() === 'b')).toBe(true);
  });
});
