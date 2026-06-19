import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import GestionAbastecimientoModal from '../../components/modals/GestionAbastecimientoModal';

// ============================================
// HOISTED
// ============================================
const {
  mockObtenerConfig, mockActualizarConfig,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockObtenerConfig: vi.fn(),
  mockActualizarConfig: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

// ============================================
// MOCKS
// ============================================
vi.mock('../../hooks/useToast', () => {
  const toastObj = { success: mockToastSuccess, error: mockToastError, warning: vi.fn(), info: vi.fn() };
  return { useToast: () => toastObj, useConfirm: () => vi.fn() };
});

vi.mock('../../services/inventario-service', () => ({
  obtenerConfigAbastecimientoService: mockObtenerConfig,
  actualizarConfigAbastecimientoService: mockActualizarConfig,
}));

// ============================================
// RENDER
// ============================================
const renderModal = () =>
  render(
    <HeroUIProvider disableAnimation={true}>
      <GestionAbastecimientoModal isOpen={true} onOpenChange={vi.fn()} />
    </HeroUIProvider>
  );

const configMock = [
  { idCategoria: 1, nombreCategoria: 'Abarrotes', inventario: true, bodegaTransito: false },
  { idCategoria: 2, nombreCategoria: 'Lácteos', inventario: false, bodegaTransito: true },
];

// ============================================
// SUITE
// ============================================
describe('GestionAbastecimientoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerConfig.mockResolvedValue(configMock);
    mockActualizarConfig.mockResolvedValue(true);
  });

  afterEach(() => cleanup());

  // ABA-01
  it('ABA-01: al abrir carga la configuración de abastecimiento', async () => {
    renderModal();
    await screen.findByText('Abarrotes');
    expect(mockObtenerConfig).toHaveBeenCalledTimes(1);
  });

  // ABA-02
  it('ABA-02: muestra las categorías con sus columnas Inventario y Bodega Tránsito', async () => {
    renderModal();
    expect(await screen.findByText('Abarrotes')).toBeInTheDocument();
    expect(screen.getByText('Lácteos')).toBeInTheDocument();
    expect(screen.getByText('Inventario')).toBeInTheDocument();
    expect(screen.getByText('Bodega Tránsito')).toBeInTheDocument();
  });

  // ABA-03
  it('ABA-03: guardar envía la configuración actual a actualizarConfigAbastecimientoService', async () => {
    renderModal();
    await screen.findByText('Abarrotes');
    fireEvent.click(screen.getByText('Guardar'));
    await vi.waitFor(() =>
      expect(mockActualizarConfig).toHaveBeenCalledWith([
        { idCategoria: 1, inventario: true, bodegaTransito: false },
        { idCategoria: 2, inventario: false, bodegaTransito: true },
      ])
    );
  });

  // ABA-04
  it('ABA-04: alternar el flag de Inventario de una categoría se refleja al guardar', async () => {
    renderModal();
    const nombre = await screen.findByText('Abarrotes');
    const fila = nombre.parentElement as HTMLElement;
    const checkboxes = fila.querySelectorAll('input[type="checkbox"]'); // [inventario, bodegaTransito]
    fireEvent.click(checkboxes[0]); // desactiva inventario de Abarrotes

    fireEvent.click(screen.getByText('Guardar'));
    await vi.waitFor(() =>
      expect(mockActualizarConfig).toHaveBeenCalledWith([
        { idCategoria: 1, inventario: false, bodegaTransito: false },
        { idCategoria: 2, inventario: false, bodegaTransito: true },
      ])
    );
  });
});
