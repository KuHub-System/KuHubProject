import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import GestionUnidadesModal from '../../components/modals/GestionUnidadesModal';

// ============================================
// HOISTED
// ============================================
const {
  mockObtenerUnidades, mockCrearUnidad, mockActualizarUnidad,
  mockEliminarUnidad, mockTransferirUnidad, mockCambiarEstado,
  mockToastSuccess, mockToastError, mockToastWarning,
} = vi.hoisted(() => ({
  mockObtenerUnidades: vi.fn(),
  mockCrearUnidad: vi.fn(),
  mockActualizarUnidad: vi.fn(),
  mockEliminarUnidad: vi.fn(),
  mockTransferirUnidad: vi.fn(),
  mockCambiarEstado: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
}));

// ============================================
// MOCKS
// ============================================
// El objeto del toast debe ser ESTABLE entre renders para no recrear los useCallback.
vi.mock('../../hooks/useToast', () => {
  const toastObj = { success: mockToastSuccess, error: mockToastError, warning: mockToastWarning, info: vi.fn() };
  return { useToast: () => toastObj, useConfirm: () => vi.fn() };
});

vi.mock('../../services/unidad-medida-service', () => ({
  obtenerUnidadesService: mockObtenerUnidades,
  crearUnidadService: mockCrearUnidad,
  actualizarUnidadService: mockActualizarUnidad,
  eliminarUnidadService: mockEliminarUnidad,
  transferirProductosUnidadService: mockTransferirUnidad,
  cambiarEstadoUnidadService: mockCambiarEstado,
}));

// ============================================
// RENDER
// ============================================
const renderModal = () =>
  render(
    <HeroUIProvider disableAnimation={true}>
      <GestionUnidadesModal isOpen={true} onOpenChange={vi.fn()} onRefresh={vi.fn()} />
    </HeroUIProvider>
  );

const unidadesMock = [
  { id: '1', nombre: 'Kilogramo', abreviatura: 'kg', esFraccionario: true, activo: true, asociados: 0 },
  { id: '2', nombre: 'Litro', abreviatura: 'L', esFraccionario: true, activo: true, asociados: 4 },
];

// ============================================
// SUITE
// ============================================
describe('GestionUnidadesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerUnidades.mockResolvedValue(unidadesMock);
    mockEliminarUnidad.mockResolvedValue(true);
    mockTransferirUnidad.mockResolvedValue('Productos transferidos');
  });

  afterEach(() => cleanup());

  // UNI-01
  it('UNI-01: al abrir carga las unidades desde el servicio', async () => {
    renderModal();
    await screen.findByText('Kilogramo');
    expect(mockObtenerUnidades).toHaveBeenCalled();
  });

  // UNI-02
  it('UNI-02: muestra las unidades cargadas', async () => {
    renderModal();
    expect(await screen.findByText('Kilogramo')).toBeInTheDocument();
    expect(await screen.findByText('Litro')).toBeInTheDocument();
  });

  // UNI-03
  it('UNI-03: eliminar una unidad SIN productos asociados ejecuta eliminarUnidadService tras escribir ELIMINAR', async () => {
    renderModal();
    const nombre = await screen.findByText('Kilogramo');
    const fila = nombre.parentElement!.parentElement as HTMLElement;
    const botones = fila.querySelectorAll('button'); // [editar, eliminar]
    fireEvent.click(botones[botones.length - 1]); // trash

    const inputConfirm = await screen.findByPlaceholderText('ELIMINAR');
    fireEvent.change(inputConfirm, { target: { value: 'ELIMINAR' } });
    fireEvent.click(screen.getByText('Eliminar Definitivamente'));

    await vi.waitFor(() => expect(mockEliminarUnidad).toHaveBeenCalledWith('1'));
  });

  // UNI-04
  it('UNI-04: eliminar una unidad CON productos asociados abre el modal de transferencia y NO elimina', async () => {
    renderModal();
    const nombre = await screen.findByText('Litro');
    const fila = nombre.parentElement!.parentElement as HTMLElement;
    const botones = fila.querySelectorAll('button');
    fireEvent.click(botones[botones.length - 1]); // trash en Litro (asociados=4)

    expect(await screen.findByText('Unidad con productos asociados')).toBeInTheDocument();
    expect(mockEliminarUnidad).not.toHaveBeenCalled();
  });
});
