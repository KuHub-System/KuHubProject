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
  mockObtenerReservas, mockObtenerSalas,
  mockCrearSala, mockEliminarSala,
  mockObtenerAsignaturas, mockObtenerUsuarios,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockObtenerReservas:    vi.fn(),
  mockObtenerSalas:       vi.fn(),
  mockCrearSala:          vi.fn(),
  mockEliminarSala:       vi.fn(),
  mockObtenerAsignaturas: vi.fn(),
  mockObtenerUsuarios:    vi.fn(),
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

// Toast ESTABLE: mismo objeto entre renders
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
  useNotifications: () => ({ showConfirm: vi.fn() }),
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

vi.mock('../../services/asignatura-service', () => ({
  obtenerAsignaturasService:            mockObtenerAsignaturas,
  crearAsignaturaService:               vi.fn(),
  actualizarAsignaturaService:          vi.fn(),
  eliminarAsignaturaService:            vi.fn(),
  crearSeccionNuevaService:             vi.fn(),
  actualizarSeccionDeltaService:        vi.fn(),
  eliminarSeccionService:               vi.fn(),
}));

vi.mock('../../services/usuario-service', () => ({
  obtenerUsuariosService:                       mockObtenerUsuarios,
  obtenerUsuariosGestoresAsignaturaService:     vi.fn().mockResolvedValue([]),
  obtenerUsuariosAsignadosSeccionService:       vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/sala-service', () => ({
  obtenerSalasActivasService: mockObtenerSalas,
  crearSalaService:           mockCrearSala,
  actualizarSalaService:      vi.fn(),
  eliminarSalaService:        mockEliminarSala,
}));

vi.mock('../../services/reserva-sala-service', () => ({
  obtenerReservasActivasService: mockObtenerReservas,
  DIA_DISPLAY: {
    LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
  },
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

// Permisos base para vista de Reservas (SA-01..03)
const permReservas = {
  ADMIN_SALAS_RESERVAS: { canRead: true },
  GA_VER_RESERVAS:      { canRead: true },
};

// Permisos base para vista de Gestión Salas (SA-04..08)
const permSalas = {
  ADMIN_SALAS_RESERVAS: { canRead: true },
  GA_VER_SALAS:         { canRead: true },
};

// ============================================
// HELPER
// ============================================
const findButton = (text: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text
  ) as HTMLButtonElement | undefined;

// ============================================
// DATOS DE PRUEBA
// ============================================
// 3 reservas: LG1 solo en Lunes, LG2 en Martes y Miércoles → Total=3, SalasEnUso=2, SeccActivas=2
const mockReservas = [
  {
    nombreAsignatura: 'Panadería',  nombreSeccion: 'Sección 001',
    nombreSala: 'Lab Gastro 1', codSala: 'LG1', diaSemana: 'LUNES',
    numeroBloque: 1, horaInicio: '08:00', horaFin: '09:30',
  },
  {
    nombreAsignatura: 'Cocina',     nombreSeccion: 'Sección 002',
    nombreSala: 'Lab Gastro 2', codSala: 'LG2', diaSemana: 'MARTES',
    numeroBloque: 2, horaInicio: '09:45', horaFin: '11:15',
  },
  {
    nombreAsignatura: 'Pastelería', nombreSeccion: 'Sección 002',
    nombreSala: 'Lab Gastro 2', codSala: 'LG2', diaSemana: 'MIERCOLES',
    numeroBloque: 3, horaInicio: '11:30', horaFin: '13:00',
  },
];

const mockSala = { idSala: 1, codSala: 'LG1', nombreSala: 'Lab Gastro 1' };

// ============================================
// SUITE
// ============================================
describe('SeccionReservas / SeccionGestionSalas (SA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerAsignaturas.mockResolvedValue({ asignaturas: [], totalPages: 1 });
    mockObtenerUsuarios.mockResolvedValue([]);
    mockObtenerReservas.mockResolvedValue(mockReservas);
    mockObtenerSalas.mockResolvedValue([mockSala]);
    mockCrearSala.mockResolvedValue({ idSala: 2, codSala: 'LG2', nombreSala: 'Lab Gastro 2' });
    mockEliminarSala.mockResolvedValue({});
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
    })) as any;
  });

  afterEach(() => cleanup());

  // ── SA-01 ──────────────────────────────────────────────────────────────────
  it('SA-01: 3 reservas → KPIs: Total=3, Salas en Uso=2, Secciones Activas=2', async () => {
    mockPermisos(permReservas);
    renderPage();
    await screen.findByRole('heading', { name: 'Reservas Registradas' });
    // KPI labels
    expect(screen.getByText('Total Reservas')).toBeInTheDocument();
    expect(screen.getByText('Salas en Uso')).toBeInTheDocument();
    expect(screen.getByText('Secciones Activas')).toBeInTheDocument();
    // KPI valores numéricos (primer p.text-2xl dentro del div del label)
    const totalDiv = screen.getByText('Total Reservas').closest('div')!;
    const salasDiv = screen.getByText('Salas en Uso').closest('div')!;
    const seccsDiv = screen.getByText('Secciones Activas').closest('div')!;
    expect(totalDiv.querySelector('p.text-2xl')?.textContent).toBe('3');
    expect(salasDiv.querySelector('p.text-2xl')?.textContent).toBe('2');
    expect(seccsDiv.querySelector('p.text-2xl')?.textContent).toBe('2');
  });

  // ── SA-02 ──────────────────────────────────────────────────────────────────
  it('SA-02: chip "Lunes" filtra y solo muestra la reserva del lunes', async () => {
    mockPermisos(permReservas);
    renderPage();
    await screen.findByText('Panadería');
    // El chip de filtro (CardHeader) aparece antes que el chip de la fila (CardBody)
    const lunesChip = screen.getAllByText('Lunes')[0];
    fireEvent.click(lunesChip);
    await waitFor(() => {
      expect(screen.getByText('Panadería')).toBeInTheDocument();
      expect(screen.queryByText('Cocina')).not.toBeInTheDocument();
      expect(screen.queryByText('Pastelería')).not.toBeInTheDocument();
    });
  });

  // ── SA-03 ──────────────────────────────────────────────────────────────────
  it('SA-03: búsqueda "LG1" filtra solo las reservas con ese codSala', async () => {
    mockPermisos(permReservas);
    renderPage();
    await screen.findByText('Panadería');
    const searchInput = screen.getByPlaceholderText(/buscar asignatura, sección o sala/i);
    fireEvent.change(searchInput, { target: { value: 'LG1' } });
    await waitFor(() => {
      expect(screen.getByText('Panadería')).toBeInTheDocument();
      expect(screen.queryByText('Cocina')).not.toBeInTheDocument();
    });
  });

  // ── SA-04 ──────────────────────────────────────────────────────────────────
  it('SA-04: carga 1 sala → card "LG1" visible y contador "1 sala registrada"', async () => {
    mockPermisos(permSalas);
    renderPage();
    await screen.findByText('1 sala registrada');
    expect(screen.getByText('LG1')).toBeInTheDocument();
    expect(screen.getByText('Lab Gastro 1')).toBeInTheDocument();
  });

  // ── SA-05 ──────────────────────────────────────────────────────────────────
  it('SA-05: crear sala llama crearSalaService con los datos del formulario y muestra toast', async () => {
    mockPermisos({ ...permSalas, GA_CREAR_SALA: { canCreate: true } });
    renderPage();
    await screen.findByText('Salas Activas');
    // Abrir modal crear
    const nuevaSalaBtn = screen.getByText('Nueva Sala').closest('button') as HTMLElement;
    fireEvent.click(nuevaSalaBtn);
    await screen.findByText('Crear Sala');
    // Rellenar formulario
    const codInput = screen.getByPlaceholderText('Ej: LG1, AULA-01');
    const nomInput = screen.getByPlaceholderText('Ej: Laboratorio de Gastronomía');
    fireEvent.change(codInput, { target: { value: 'LG2' } });
    fireEvent.change(nomInput, { target: { value: 'Lab Gastro 2' } });
    // Esperar que el botón se habilite y hacer clic
    await waitFor(() => expect(findButton('Crear Sala')).not.toBeDisabled());
    fireEvent.click(findButton('Crear Sala') as HTMLElement);
    await waitFor(() =>
      expect(mockCrearSala).toHaveBeenCalledWith(
        expect.objectContaining({ codSala: 'LG2', nombreSala: 'Lab Gastro 2' })
      )
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Sala creada correctamente');
  });

  // ── SA-06 ──────────────────────────────────────────────────────────────────
  it('SA-06: desactivar sala requiere "CONFIRMAR"; botón habilitado solo al escribirlo', async () => {
    mockPermisos({ ...permSalas, GA_ELIMINAR_SALA: { canDelete: true } });
    renderPage();
    await screen.findByText('Salas Activas');
    await waitFor(() =>
      expect(document.querySelector('button[aria-label="Desactivar"]')).toBeTruthy()
    );
    // Abrir modal de confirmación
    const desactivarIcon = document.querySelector('button[aria-label="Desactivar"]') as HTMLElement;
    fireEvent.click(desactivarIcon);
    await screen.findByText('Desactivar Sala');
    // Botón deshabilitado sin texto
    expect(findButton('Desactivar')).toBeDisabled();
    // Escribir "CONFIRMAR"
    const confirmInput = screen.getByPlaceholderText('CONFIRMAR');
    fireEvent.change(confirmInput, { target: { value: 'CONFIRMAR' } });
    await waitFor(() => expect(findButton('Desactivar')).not.toBeDisabled());
    // Confirmar desactivación
    fireEvent.click(findButton('Desactivar') as HTMLElement);
    await waitFor(() => expect(mockEliminarSala).toHaveBeenCalled());
    expect(mockToastSuccess).toHaveBeenCalledWith('Sala desactivada correctamente');
  });

  // ── SA-07 ──────────────────────────────────────────────────────────────────
  it('SA-07: si servicio rechaza por reservas activas → toast de error y sala permanece', async () => {
    mockEliminarSala.mockRejectedValue(new Error('La sala tiene reservas activas'));
    mockPermisos({ ...permSalas, GA_ELIMINAR_SALA: { canDelete: true } });
    renderPage();
    await screen.findByText('Salas Activas');
    await waitFor(() =>
      expect(document.querySelector('button[aria-label="Desactivar"]')).toBeTruthy()
    );
    // Abrir modal
    const desactivarIcon = document.querySelector('button[aria-label="Desactivar"]') as HTMLElement;
    fireEvent.click(desactivarIcon);
    await screen.findByText('Desactivar Sala');
    // Confirmar
    const confirmInput = screen.getByPlaceholderText('CONFIRMAR');
    fireEvent.change(confirmInput, { target: { value: 'CONFIRMAR' } });
    await waitFor(() => expect(findButton('Desactivar')).not.toBeDisabled());
    fireEvent.click(findButton('Desactivar') as HTMLElement);
    // Servicio falla → toast error
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('La sala tiene reservas activas')
    );
    // La sala permanece en el DOM (el ícono de Desactivar sigue disponible)
    await waitFor(() =>
      expect(document.querySelector('button[aria-label="Desactivar"]')).toBeTruthy()
    );
  });

  // ── SA-08 ──────────────────────────────────────────────────────────────────
  it('SA-08: sin permisos CRUD sala → sin botones de acción y texto "Solo lectura" visible', async () => {
    mockPermisos(permSalas); // GA_CREAR/EDITAR/ELIMINAR_SALA todos en false
    renderPage();
    await screen.findByText('Salas Activas');
    // Esperar que carguen las salas
    await waitFor(() =>
      expect(document.querySelector('button[aria-label="Desactivar"]')).toBeNull()
    );
    expect(screen.queryByText('Nueva Sala')).not.toBeInTheDocument();
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
  });
});
