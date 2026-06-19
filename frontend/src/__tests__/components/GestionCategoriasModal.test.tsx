import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import GestionCategoriasModal from '../../components/modals/GestionCategoriasModal';

// ============================================
// HOISTED
// ============================================
const {
  mockObtenerCategorias, mockCrearCategoria, mockActualizarCategoria,
  mockEliminarCategoria, mockTransferirProductos, mockCambiarEstado,
  mockToastSuccess, mockToastError, mockToastWarning,
} = vi.hoisted(() => ({
  mockObtenerCategorias: vi.fn(),
  mockCrearCategoria: vi.fn(),
  mockActualizarCategoria: vi.fn(),
  mockEliminarCategoria: vi.fn(),
  mockTransferirProductos: vi.fn(),
  mockCambiarEstado: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
}));

// ============================================
// MOCKS
// ============================================
// IMPORTANTE: el objeto del toast debe ser ESTABLE entre renders. Si se devuelve un objeto
// nuevo cada vez, los useCallback que dependen de `toast` se recrean y disparan un bucle de
// re-render que descarta las interacciones (click en eliminar/transferir).
vi.mock('../../hooks/useToast', () => {
  const toastObj = { success: mockToastSuccess, error: mockToastError, warning: mockToastWarning, info: vi.fn() };
  return { useToast: () => toastObj, useConfirm: () => vi.fn() };
});

vi.mock('../../services/storage-service', () => ({
  obtenerCategorias: vi.fn().mockReturnValue([]),
  crearCategoria: vi.fn(),
  actualizarCategoria: vi.fn(),
}));

vi.mock('../../services/categoria-service', () => ({
  obtenerCategoriasService: mockObtenerCategorias,
  crearCategoriaService: mockCrearCategoria,
  actualizarCategoriaService: mockActualizarCategoria,
  eliminarCategoriaService: mockEliminarCategoria,
  transferirProductosService: mockTransferirProductos,
  cambiarEstadoCategoriaService: mockCambiarEstado,
}));

// ============================================
// RENDER
// ============================================
const renderModal = () =>
  render(
    <HeroUIProvider disableAnimation={true}>
      <GestionCategoriasModal isOpen={true} onOpenChange={vi.fn()} onRefresh={vi.fn()} />
    </HeroUIProvider>
  );

const categoriasMock = [
  { id: '1', nombre: 'Abarrotes', activo: true, asociados: 0 },
  { id: '2', nombre: 'Lácteos', activo: true, asociados: 3 },
];

// ============================================
// SUITE
// ============================================
describe('GestionCategoriasModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerCategorias.mockResolvedValue(categoriasMock);
    mockCrearCategoria.mockResolvedValue(true);
    mockEliminarCategoria.mockResolvedValue(true);
    mockTransferirProductos.mockResolvedValue('Productos transferidos');
  });

  afterEach(() => cleanup());

  // CAT-01
  it('CAT-01: al abrir carga las categorías desde el servicio', async () => {
    renderModal();
    await waitFor(() => expect(mockObtenerCategorias).toHaveBeenCalled());
  });

  // CAT-02
  it('CAT-02: muestra las categorías cargadas', async () => {
    renderModal();
    expect(await screen.findByText('Abarrotes')).toBeInTheDocument();
    expect(await screen.findByText('Lácteos')).toBeInTheDocument();
  });

  // CAT-03
  it('CAT-03: crear una categoría llama a crearCategoriaService', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Abarrotes')).toBeInTheDocument());
    // Abrir el formulario de alta (botón con ícono +)
    const addToggle = screen.getByText('Lista de Categorías').parentElement?.querySelector('button');
    fireEvent.click(addToggle!);
    const input = screen.getByPlaceholderText('Nombre de la categoría');
    fireEvent.change(input, { target: { value: 'Congelados' } });
    fireEvent.click(screen.getByText('Añadir'));
    await waitFor(() => expect(mockCrearCategoria).toHaveBeenCalledWith('Congelados'));
  });

  // CAT-04
  it('CAT-04: eliminar una categoría SIN productos asociados ejecuta eliminarCategoriaService tras escribir ELIMINAR', async () => {
    renderModal();
    const nombre = await screen.findByText('Abarrotes');
    const fila = nombre.parentElement!.parentElement as HTMLElement; // span → div nombre → fila
    const botones = fila.querySelectorAll('button'); // [editar, eliminar]
    fireEvent.click(botones[botones.length - 1]); // botón eliminar (trash)

    const inputConfirm = await screen.findByPlaceholderText('ELIMINAR');
    fireEvent.change(inputConfirm, { target: { value: 'ELIMINAR' } });
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => expect(mockEliminarCategoria).toHaveBeenCalledWith('1'));
  });

  // CAT-05
  it('CAT-05: eliminar una categoría CON productos asociados abre el modal de transferencia y NO elimina', async () => {
    renderModal();
    const nombre = await screen.findByText('Lácteos');
    const fila = nombre.parentElement!.parentElement as HTMLElement;
    const botones = fila.querySelectorAll('button');
    fireEvent.click(botones[botones.length - 1]); // trash en Lácteos (asociados=3)

    await waitFor(() =>
      expect(screen.getByText('Categoría con productos asociados')).toBeInTheDocument()
    );
    expect(mockEliminarCategoria).not.toHaveBeenCalled();
  });
});
