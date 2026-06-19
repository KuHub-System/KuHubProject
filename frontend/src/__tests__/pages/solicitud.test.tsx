import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import SolicitudPage from '../../pages/solicitud';
import GestionSolicitudesPage from '../../pages/gestion-solicitudes';
import * as authContext from '../../contexts/auth-context';
import * as permissionContext from '../../contexts/permission-context';

// ============================================
// HOISTED: disponibles antes del hoisting de vi.mock
// ============================================

const {
  mockToastSuccess, mockToastError, mockToastWarning,
  mockObtenerCursos, mockObtenerRecetas, mockObtenerProductos,
  mockGenerarMasivas,
  mockObtenerPorSemana, mockCambiarEstadoMasivo, mockRechazarEnPedido,
  mockUsePeriodoSemana,
} = vi.hoisted(() => ({
  mockToastSuccess:        vi.fn(),
  mockToastError:          vi.fn(),
  mockToastWarning:        vi.fn(),
  mockObtenerCursos:       vi.fn(),
  mockObtenerRecetas:      vi.fn(),
  mockObtenerProductos:    vi.fn(),
  mockGenerarMasivas:      vi.fn(),
  mockObtenerPorSemana:    vi.fn(),
  mockCambiarEstadoMasivo: vi.fn(),
  mockRechazarEnPedido:    vi.fn(),
  mockUsePeriodoSemana:    vi.fn(),
}));

// ============================================
// MOCKS LIBRERÍAS EXTERNAS
// ============================================

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ============================================
// MOCKS HOOKS
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
// MOCKS CONTEXTOS
// ============================================

vi.mock('../../contexts/periodo-semana-context', () => ({
  usePeriodoSemana: () => mockUsePeriodoSemana(),
}));

// ============================================
// MOCKS SERVICIOS
// ============================================

vi.mock('../../services/solicitud-service', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/solicitud-service')>();
  return {
    ...original,
    obtenerCursosParaSolicitudService:         mockObtenerCursos,
    obtenerRecetasSolicitudService:            mockObtenerRecetas,
    obtenerProductosOpcionConCategoriaService: mockObtenerProductos,
    generarSolicitudesMasivasService:          mockGenerarMasivas,
    obtenerSolicitudesPorSemanaService:        mockObtenerPorSemana,
    cambiarEstadoMasivoService:                mockCambiarEstadoMasivo,
    rechazarSolicitudEnPedidoService:          mockRechazarEnPedido,
  };
});

// ============================================
// DATOS DE PRUEBA
// ============================================

const asignaturaTest = {
  idAsignatura: 1,
  nombreAsignatura: 'Gastronomía Básica',
  secciones: [{
    id_seccion: 101,
    nombre_seccion: 'S1',
    id_usuario: 5,
    nombre_docente: 'Prof. García',
    cant_inscritos: 20,
    capacidad_max: 25,
    horarios: [{
      idReservaSala: 10, numeroBloque: 1,
      horaInicio: '08:00:00', horaFin: '09:30:00',
      diaSemana: 'LUNES', idSala: 1, codSala: 'A101', nombreSala: 'Sala A',
    }],
  }],
};

const semanaTest = { idSemana: 1, nombreSemana: 'Semana 1', fechaInicio: '2026-06-01', fechaFin: '2026-06-07' };

const mkSolicitudRaw = (id: number, nombreAsig: string, idAsig: number, estado: string) => ({
  idSolicitud:    id,
  idReservaSala:  id * 10,
  idReceta:       1,
  nombreReceta:   'Pan Amasado',
  fechaSolicitada: '2026-06-02',
  estadoSolicitud: estado,
  productos: [],
  asignaturaDetalle: {
    id_asignatura:    idAsig,
    nombre_asignatura: nombreAsig,
    seccion: {
      id_seccion:    100 + id,
      nombre_seccion: `S${id}`,
      id_usuario:     5,
      nombre_docente: 'Prof. García',
      cant_inscritos: 20,
      capacidad_max:  25,
      horarios: [],
    },
  },
});

const solGastro   = mkSolicitudRaw(1, 'Gastronomía Básica', 1, 'PENDIENTE');
const solPastel   = mkSolicitudRaw(2, 'Pastelería', 2, 'PENDIENTE');
const solAceptada = mkSolicitudRaw(3, 'Gastronomía Básica', 1, 'ACEPTADA');

// ============================================
// HELPERS
// ============================================

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <BrowserRouter>
      <HeroUIProvider disableAnimation={true}>
        {component}
      </HeroUIProvider>
    </BrowserRouter>
  );

const periodoVacio = {
  periodos: [], semanas: [], periodo: null, semanaId: null, defaultSemanaId: null,
  isLoading: false,
  seleccionarPeriodo: vi.fn(), seleccionarSemana: vi.fn(), recargarPeriodos: vi.fn(),
};

const periodoConSemana = {
  ...periodoVacio,
  periodos:      [{ anio: 2026, semestres: [1] }],
  semanas:       [semanaTest],
  periodo:       { anio: 2026, semestre: 1 },
  semanaId:      '1',
  defaultSemanaId: '1',
};

const mockAdmin = () =>
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: 1, email: 'admin@kuhub.cl', nombre: 'Admin', rol: 'Administrador' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(), logout: vi.fn(),
    canAccessPage: vi.fn(() => true),
    userRole: null,
  } as any);

const defaultModulePerm = {
  canRead: false, canCreate: false, canUpdate: false,
  canDelete: false, accessLevel: 'none' as const, hasAccess: false, isLoading: false,
};

const mockPermissionBase = () =>
  vi.spyOn(permissionContext, 'usePermission').mockReturnValue({
    isAdmin: false,
    canRead:        vi.fn(() => false),
    canCreate:      vi.fn(() => false),
    canUpdate:      vi.fn(() => false),
    canDelete:      vi.fn(() => false),
    canAccess:      vi.fn(() => false),
    getAccessLevel: vi.fn(() => 0),
    isLoading: false,
  } as any);

const mockSolicitudPerms = (canCreate = true) =>
  vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((modulo) => {
    if (modulo === 'SOLICITUD') return { ...defaultModulePerm, canCreate };
    return defaultModulePerm;
  });

const mockGestionPerms = (solGestionar = true, solRechazar = true) =>
  vi.spyOn(permissionContext, 'useModulePermission').mockImplementation((modulo) => {
    if (modulo === 'GEST_SOL_GESTIONAR') return { ...defaultModulePerm, canUpdate: solGestionar };
    if (modulo === 'GEST_SOL_RECHAZAR')  return { ...defaultModulePerm, canUpdate: solRechazar };
    return defaultModulePerm;
  });

const waitForNoLoader = (texto: string) =>
  waitFor(() => expect(screen.queryByText(texto)).not.toBeInTheDocument(), { timeout: 3000 });

// ============================================
// SUITE 1: SolicitudPage — Permisos y Carga
// ============================================

describe('SolicitudPage — Permisos y Carga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissionBase();
    mockSolicitudPerms(true);
    mockUsePeriodoSemana.mockReturnValue(periodoVacio);
    mockObtenerCursos.mockResolvedValue([asignaturaTest]);
    mockObtenerRecetas.mockResolvedValue([]);
    mockObtenerProductos.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it('SOL-01: sin permiso CREAR con asignaturas → muestra mensaje de solo lectura', async () => {
    // Arrange
    mockSolicitudPerms(false);

    // Act
    renderWithProviders(<SolicitudPage />);
    await waitForNoLoader('Cargando asignaturas...');

    // Assert
    expect(screen.getByText('Solo lectura — no tienes permiso para crear solicitudes.')).toBeInTheDocument();
  });

  it('SOL-02: al montar, los 3 servicios de carga se invocan una vez', async () => {
    // Act
    renderWithProviders(<SolicitudPage />);
    await waitForNoLoader('Cargando asignaturas...');

    // Assert
    expect(mockObtenerCursos).toHaveBeenCalledTimes(1);
    expect(mockObtenerRecetas).toHaveBeenCalledTimes(1);
    expect(mockObtenerProductos).toHaveBeenCalledTimes(1);
  });

  it('SOL-03: sin asignaturas disponibles → muestra texto vacío', async () => {
    // Arrange
    mockObtenerCursos.mockResolvedValue([]);

    // Act
    renderWithProviders(<SolicitudPage />);
    await waitForNoLoader('Cargando asignaturas...');

    // Assert
    expect(screen.getByText('No hay asignaturas disponibles')).toBeInTheDocument();
  });

  it('SOL-08: botón "Configure una asignatura" deshabilitado sin configuración', async () => {
    // Act
    renderWithProviders(<SolicitudPage />);
    await waitForNoLoader('Cargando asignaturas...');

    // Assert
    const btn = screen.getByRole('button', { name: /Configure una asignatura/ });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-disabled', 'true');
  });
});

// ============================================
// SUITE 2: GestionSolicitudesPage — Carga y Filtros
// ============================================

describe('GestionSolicitudesPage — Carga y Filtros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissionBase();
    mockGestionPerms(true, true);
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
    mockObtenerPorSemana.mockResolvedValue([]);
    mockCambiarEstadoMasivo.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('SOL-11: con semanaId activa, llama al servicio de solicitudes por semana', async () => {
    // Act
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() =>
      expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(),
      { timeout: 3000 }
    );

    // Assert
    expect(mockObtenerPorSemana).toHaveBeenCalledTimes(1);
    expect(mockObtenerPorSemana).toHaveBeenCalledWith({
      fechaInicio: '2026-06-01',
      fechaFin:    '2026-06-07',
    });
  });

  it('SOL-12: filtro "Pendiente" por defecto oculta solicitudes en estado Aceptada', async () => {
    // Arrange — una PENDIENTE (Gastronomía §S1) y una ACEPTADA (Gastronomía §S3)
    mockObtenerPorSemana.mockResolvedValue([solGastro, solAceptada]);

    // Act
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Assert — sección pendiente visible, sección aceptada oculta
    expect(screen.getByText('§S1')).toBeInTheDocument();
    expect(screen.queryByText('§S3')).not.toBeInTheDocument();
  });

  it('SOL-13: búsqueda "Gastro" filtra por nombre de asignatura, ocultando Pastelería', async () => {
    // Arrange — dos pendientes: Gastronomía §S1 y Pastelería §S2
    mockObtenerPorSemana.mockResolvedValue([solGastro, solPastel]);

    // Act
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Verificar que ambas secciones son visibles antes de buscar
    expect(screen.getByText('§S1')).toBeInTheDocument();
    expect(screen.getByText('§S2')).toBeInTheDocument();

    // Escribir en el buscador
    const searchInput = screen.getByPlaceholderText('Buscar asignatura, receta, docente...');
    fireEvent.change(searchInput, { target: { value: 'Gastro' } });

    // Assert — solo Gastronomía visible
    await waitFor(() => {
      expect(screen.getByText('§S1')).toBeInTheDocument();
      expect(screen.queryByText('§S2')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// SUITE 3: GestionSolicitudesPage — Acciones
// ============================================

describe('GestionSolicitudesPage — Acciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissionBase();
    mockGestionPerms(true, true);
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
    mockCambiarEstadoMasivo.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('SOL-14: botón "Aceptar 1" del grupo llama al servicio con estado ACEPTADA', async () => {
    // Arrange — una solicitud PENDIENTE en Gastronomía
    mockObtenerPorSemana.mockResolvedValue([solGastro]);
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Act — el botón del grupo dice "Aceptar 1" (sin "pendiente"), el global dice "Aceptar 1 pendiente"
    const aceptarGrupoBtn = screen.getByRole('button', { name: 'Aceptar 1' });
    fireEvent.click(aceptarGrupoBtn);

    // Assert
    await waitFor(() => {
      expect(mockCambiarEstadoMasivo).toHaveBeenCalledWith({
        estadosSolicitudes: [{ idSolicitud: 1, estado: 'ACEPTADA' }],
      });
    });
  });

  it('SOL-16: flujo rechazar desde modal de detalle → servicio llamado con RECHAZADA y motivo', async () => {
    // Arrange — una solicitud PENDIENTE
    mockObtenerPorSemana.mockResolvedValue([solGastro]);
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Act 1 — abrir modal de detalle haciendo click en el nombre de sección
    fireEvent.click(screen.getByText('§S1'));
    await waitFor(() => expect(screen.getByText('Detalle de Solicitud')).toBeInTheDocument());

    // Act 2 — click en "Rechazar" dentro del footer del modal de detalle
    const rechazarEnDetalle = screen.getByRole('button', { name: /^Rechazar$/ });
    fireEvent.click(rechazarEnDetalle);
    await waitFor(() => expect(screen.getByText('Rechazar solicitud')).toBeInTheDocument());

    // Act 3 — escribir motivo
    const motivoTextarea = screen.getByLabelText(/Motivo del rechazo/i);
    fireEvent.change(motivoTextarea, { target: { value: 'Motivo de prueba' } });

    // Act 4 — confirmar
    const confirmarBtn = screen.getByRole('button', { name: /Confirmar rechazo/ });
    fireEvent.click(confirmarBtn);

    // Assert
    await waitFor(() => {
      expect(mockCambiarEstadoMasivo).toHaveBeenCalledWith({
        estadosSolicitudes: [{ idSolicitud: 1, estado: 'RECHAZADA', motivo: 'Motivo de prueba' }],
      });
    });
  });

  it('SOL-17: botón "Aceptar N pendientes" global llama al servicio con todas las pendientes', async () => {
    // Arrange — dos pendientes en distintas asignaturas
    mockObtenerPorSemana.mockResolvedValue([solGastro, solPastel]);
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Act
    const globalBtn = screen.getByRole('button', { name: /Aceptar 2 pendientes/ });
    fireEvent.click(globalBtn);

    // Assert — servicio llamado con los dos IDs + idSemana del contexto
    await waitFor(() => {
      expect(mockCambiarEstadoMasivo).toHaveBeenCalledWith({
        estadosSolicitudes: [
          { idSolicitud: 1, estado: 'ACEPTADA' },
          { idSolicitud: 2, estado: 'ACEPTADA' },
        ],
        idSemana: 1,
      });
    });
  });
});

// ============================================
// SUITE 4: GestionSolicitudesPage — Permisos y Contadores
// ============================================

describe('GestionSolicitudesPage — Permisos y Contadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
    mockPermissionBase();
    mockUsePeriodoSemana.mockReturnValue(periodoConSemana);
    mockCambiarEstadoMasivo.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('SOL-19: sin permiso GESTIONAR, el botón "Aceptar N" del grupo no aparece', async () => {
    // Arrange
    mockGestionPerms(false, true);
    mockObtenerPorSemana.mockResolvedValue([solGastro]);

    // Act
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Assert — el botón de grupo "Aceptar N" no debe existir
    expect(screen.queryByRole('button', { name: /Aceptar 1/ })).not.toBeInTheDocument();
  });

  it('SOL-20: los contadores reflejan correctamente el total y estados de solicitudes', async () => {
    // Arrange — 2 PENDIENTE + 1 ACEPTADA
    mockGestionPerms(true, true);
    mockObtenerPorSemana.mockResolvedValue([solGastro, solPastel, solAceptada]);

    // Act
    renderWithProviders(<GestionSolicitudesPage />);
    await waitFor(() => expect(screen.queryByText('Cargando solicitudes de la semana...')).not.toBeInTheDocument(), { timeout: 3000 });

    // Assert — pills de estado muestran conteos correctos
    // La pill "Pendiente" debe contener "(2)"
    expect(screen.getByRole('button', { name: /Pendiente.*2/ })).toBeInTheDocument();
    // La pill "Aceptada" debe contener "(1)"
    expect(screen.getByRole('button', { name: /Aceptada.*1/ })).toBeInTheDocument();
    // Las tarjetas de conteo muestran etiquetas correctas
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Aceptadas')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
});
