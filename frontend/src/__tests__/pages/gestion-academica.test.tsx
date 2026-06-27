import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import GestionAsignaturasPage from '../../pages/gestion-academica';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// HOISTED
// ============================================
const {
  mockObtenerAsignaturas, mockObtenerUsuarios,
  mockEliminarAsignatura, mockEliminarSeccion,
  mockShowConfirm, mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockObtenerAsignaturas: vi.fn(),
  mockObtenerUsuarios:    vi.fn(),
  mockEliminarAsignatura: vi.fn(),
  mockEliminarSeccion:    vi.fn(),
  mockShowConfirm:        vi.fn(),
  mockToastSuccess:       vi.fn(),
  mockToastError:         vi.fn(),
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

// Toast ESTABLE: mismo objeto entre renders evita re-renders que descartan onPress
vi.mock('../../hooks/useToast', () => {
  const toastObj = {
    success: mockToastSuccess,
    error:   mockToastError,
    warning: vi.fn(),
    info:    vi.fn(),
  };
  return { useToast: () => toastObj, useConfirm: () => vi.fn() };
});

vi.mock('../../utils/notifications', () => ({
  useNotifications: () => ({ showConfirm: mockShowConfirm }),
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

vi.mock('../../services/asignatura-service', () => ({
  obtenerAsignaturasService:            mockObtenerAsignaturas,
  crearAsignaturaService:               vi.fn(),
  actualizarAsignaturaService:          vi.fn(),
  eliminarAsignaturaService:            mockEliminarAsignatura,
  crearSeccionNuevaService:             vi.fn(),
  actualizarSeccionDeltaService:        vi.fn(),
  eliminarSeccionService:               mockEliminarSeccion,
}));

vi.mock('../../services/usuario-service', () => ({
  obtenerUsuariosService:                       mockObtenerUsuarios,
  obtenerUsuariosGestoresAsignaturaService:     vi.fn().mockResolvedValue([]),
  obtenerUsuariosAsignadosSeccionService:       vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/sala-service', () => ({
  obtenerSalasActivasService: vi.fn().mockResolvedValue([]),
  crearSalaService:           vi.fn(),
  actualizarSalaService:      vi.fn(),
  eliminarSalaService:        vi.fn(),
}));

vi.mock('../../services/reserva-sala-service', () => ({
  obtenerReservasActivasService: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/bloque-horario-service', () => ({
  filtrarBloquesPorSalaYDiaService:             vi.fn().mockResolvedValue([]),
  obtenerBloquesReservadosPorDocenteService:    vi.fn().mockResolvedValue([]),
}));

// ============================================
// RENDER
// ============================================
const renderPage = () =>
  render(
    <BrowserRouter>
      <HeroUIProvider disableAnimation={true}>
        <GestionAsignaturasPage />
      </HeroUIProvider>
    </BrowserRouter>
  );

// ============================================
// PERMISOS
// ============================================
const noPerm = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };

const mockPermisos = (overrides: Partial<Record<string, Partial<typeof noPerm>>> = {}) => {
  vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
    isLoading: false,
    canRead: (_: string) => false,
  } as any);
  vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((mod: any) => ({
    ...noPerm,
    ...(overrides[mod] ?? {}),
  } as any));
};

// ============================================
// DATOS DE PRUEBA
// ============================================
const mockAsignatura = {
  id:                   '1',
  codigo:               'GAS-101',
  nombre:               'Panadería Básica',
  profesorACargoId:     '10',
  profesorACargoNombre: 'Prof. García',
  descripcion:          'Fundamentos de panadería',
  secciones: [
    {
      id: '101', numeroSeccion: '001',
      profesorAsignado: 'Juan Pérez', profesorAsignadoId: '20',
      capacidadMax: 30, cantInscritos: 15, estado: 'ACTIVA', bloquesHorarios: [],
    },
    {
      id: '102', numeroSeccion: '002',
      profesorAsignado: 'Ana López', profesorAsignadoId: '21',
      capacidadMax: 30, cantInscritos: 25, estado: 'ACTIVA', bloquesHorarios: [],
    },
  ],
  fechaCreacion:      '2026-01-01T00:00:00',
  fechaActualizacion: '2026-01-01T00:00:00',
};

// ============================================
// SUITE
// ============================================
describe('GestionAsignaturasPage (GA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerAsignaturas.mockResolvedValue({ asignaturas: [mockAsignatura], totalPages: 1 });
    mockObtenerUsuarios.mockResolvedValue([]);
    mockEliminarAsignatura.mockResolvedValue({});
    mockEliminarSeccion.mockResolvedValue({});
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
    })) as any;
  });

  afterEach(() => cleanup());

  // ── GA-01 ──────────────────────────────────────────────────────────────────
  it('GA-01: carga inicial llama obtenerAsignaturasService(1) y renderiza la tarjeta', async () => {
    mockPermisos({ GESTION_ACADEMICA: { canRead: true } });
    renderPage();
    await screen.findByText('Panadería Básica');
    expect(mockObtenerAsignaturas).toHaveBeenCalledWith(1);
    expect(screen.getByText('GAS-101')).toBeInTheDocument();
  });

  // ── GA-02 ──────────────────────────────────────────────────────────────────
  it('GA-02: búsqueda "pana" filtra client-side sin llamadas extra al servicio', async () => {
    mockPermisos({ GESTION_ACADEMICA: { canRead: true } });
    renderPage();
    await screen.findByText('Panadería Básica');
    const input = screen.getByPlaceholderText(/buscar asignaturas/i);
    fireEvent.change(input, { target: { value: 'pana' } });
    expect(screen.getByText('Panadería Básica')).toBeInTheDocument();
    expect(mockObtenerAsignaturas).toHaveBeenCalledTimes(1);
  });

  // ── GA-03 ──────────────────────────────────────────────────────────────────
  it('GA-03: expandir tarjeta muestra secciones 001 y 002 con sus docentes', async () => {
    mockPermisos({ GESTION_ACADEMICA: { canRead: true } });
    renderPage();
    await screen.findByText('Panadería Básica');
    const cardHeader = screen.getByText('Panadería Básica')
      .closest('[class*="cursor-pointer"]') as HTMLElement;
    fireEvent.click(cardHeader);
    await screen.findByText('001');
    expect(screen.getByText('002')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Ana López')).toBeInTheDocument();
  });

  // ── GA-04 ──────────────────────────────────────────────────────────────────
  it('GA-04: multiplicador refleja (15+25)/20 = 2.00x con solo secciones ACTIVA', async () => {
    mockPermisos({ GESTION_ACADEMICA: { canRead: true } });
    renderPage();
    await screen.findByText('Panadería Básica');
    expect(screen.getByText(/2\.00x/)).toBeInTheDocument();
  });

  // ── GA-05 ──────────────────────────────────────────────────────────────────
  it('GA-05: GA_CREAR_ASIGNATURA.canCreate=false → botón "Nueva Asignatura" no aparece', async () => {
    mockPermisos({ GESTION_ACADEMICA: { canRead: true } });
    renderPage();
    await screen.findByText('Panadería Básica');
    expect(screen.queryByText('Nueva Asignatura')).not.toBeInTheDocument();
  });

  // ── GA-06 ──────────────────────────────────────────────────────────────────
  it('GA-06: editarSeccion=true y eliminarSeccion=false → botones visibles sin "Solo lectura"', async () => {
    mockPermisos({
      GESTION_ACADEMICA:  { canRead: true },
      GA_EDITAR_SECCION:  { canUpdate: true },
    });
    renderPage();
    await screen.findByText('Panadería Básica');
    const cardHeader = screen.getByText('Panadería Básica')
      .closest('[class*="cursor-pointer"]') as HTMLElement;
    fireEvent.click(cardHeader);
    await screen.findByText('001');
    expect(screen.queryByText('Solo lectura')).not.toBeInTheDocument();
  });

  // ── GA-07 ──────────────────────────────────────────────────────────────────
  it('GA-07: eliminar asignatura llama showConfirm con requireText="ELIMINAR" y ejecuta el servicio', async () => {
    mockPermisos({
      GESTION_ACADEMICA:       { canRead: true },
      GA_ELIMINAR_ASIGNATURA:  { canDelete: true },
    });
    renderPage();
    await screen.findByText('Panadería Básica');
    // Solo GA_ELIMINAR_ASIGNATURA activo → único botón en .gap-2
    const cardHeader = screen.getByText('Panadería Básica')
      .closest('[class*="cursor-pointer"]') as HTMLElement;
    const actionBtn = cardHeader.querySelector('.gap-2 button') as HTMLElement;
    fireEvent.click(actionBtn);
    expect(mockShowConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ requireText: 'ELIMINAR', confirmColor: 'danger' })
    );
    await mockShowConfirm.mock.calls[0][0].onConfirm();
    expect(mockEliminarAsignatura).toHaveBeenCalledWith('1');
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  // ── GA-08 ──────────────────────────────────────────────────────────────────
  it('GA-08: eliminar sección llama showConfirm con requireText="ELIMINAR" y ejecuta el servicio', async () => {
    mockPermisos({
      GESTION_ACADEMICA:  { canRead: true },
      GA_ELIMINAR_SECCION: { canDelete: true },
    });
    const { container } = renderPage();
    await screen.findByText('Panadería Básica');
    const cardHeader = screen.getByText('Panadería Básica')
      .closest('[class*="cursor-pointer"]') as HTMLElement;
    fireEvent.click(cardHeader);
    await screen.findByText('001');
    // Las celdas de Acciones de las secciones usan flex gap-1
    const seccionBtns = container.querySelectorAll('.gap-1 button');
    expect(seccionBtns.length).toBeGreaterThan(0);
    fireEvent.click(seccionBtns[0] as HTMLElement);
    expect(mockShowConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ requireText: 'ELIMINAR', confirmColor: 'danger' })
    );
    await mockShowConfirm.mock.calls[0][0].onConfirm();
    expect(mockEliminarSeccion).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  // ── GA-09 ──────────────────────────────────────────────────────────────────
  it('GA-09: sin GESTION_ACADEMICA pero con GA_VER_RESERVAS → redirige a vista salas', async () => {
    mockPermisos({
      GA_VER_RESERVAS:      { canRead: true },
    });
    renderPage();
    await screen.findByRole('heading', { name: 'Reservas Registradas' });
    expect(screen.queryByPlaceholderText(/buscar asignaturas/i)).not.toBeInTheDocument();
  });

  // ── GA-10 ──────────────────────────────────────────────────────────────────
  it('GA-10: rail de navegación alterna entre vista académica y sala/reservas', async () => {
    mockPermisos({
      GESTION_ACADEMICA:    { canRead: true },
      GA_VER_RESERVAS:      { canRead: true },
    });
    const { container } = renderPage();
    await screen.findByText('Panadería Básica');
    const railBtns = container.querySelectorAll('button.w-12.h-12');
    expect(railBtns.length).toBe(2);
    // Cambiar a salas (botón [1] = calendar-clock)
    fireEvent.click(railBtns[1] as HTMLElement);
    await screen.findByRole('heading', { name: 'Reservas Registradas' });
    expect(screen.queryByPlaceholderText(/buscar asignaturas/i)).not.toBeInTheDocument();
    // Volver a académica (botón [0] = graduation-cap)
    fireEvent.click(railBtns[0] as HTMLElement);
    await screen.findByText('Panadería Básica');
  });
});
