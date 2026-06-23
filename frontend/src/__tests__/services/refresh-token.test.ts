import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================
// HOISTED: mock del cliente HTTP (config/Axios)
// ============================================================
const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('../../config/Axios', () => ({
  default: {
    get:    vi.fn(),
    post:   mockPost,
    patch:  vi.fn(),
    put:    vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  renovarSesionService,
  cerrarSesionService,
  obtenerSesionActualService,
} from '../../services/auth-service';
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout';

// ============================================================
// Fixture de sesión reutilizable
// ============================================================
const SESION_MOCK = {
  usuario: {
    id: '1',
    nombreCompleto: 'Admin KuHub',
    correo: 'admin@kuhub.cl',
    rol: 'ADMIN',
    fotoPerfil: undefined,
    fechaCreacion: '2024-01-01T00:00:00.000Z',
    ultimoAcceso: '2026-06-20T00:00:00.000Z',
  },
  token: 'jwt.token.original',
  fechaInicio: '2026-06-20T00:00:00.000Z',
};

// ============================================================
// RT-FE-01 — Petición normal con token válido
// Verifica que obtenerSesionActualService entrega el token
// que el interceptor de Axios añade al header Authorization.
// ============================================================
describe('RT-FE-01 — obtenerSesionActualService: token disponible para el interceptor', () => {
  beforeEach(() => localStorage.clear());

  it('RT-FE-01: devuelve el token JWT cuando sesion_actual está en localStorage', () => {
    localStorage.setItem('sesion_actual', JSON.stringify(SESION_MOCK));

    const sesion = obtenerSesionActualService();

    expect(sesion).not.toBeNull();
    expect(sesion!.token).toBe('jwt.token.original');
    expect(sesion!.usuario.correo).toBe('admin@kuhub.cl');
  });

  it('RT-FE-01 (sin sesión): devuelve null cuando localStorage no tiene sesion_actual', () => {
    expect(obtenerSesionActualService()).toBeNull();
  });

  it('RT-FE-01 (JSON inválido): devuelve null si sesion_actual contiene datos corruptos', () => {
    localStorage.setItem('sesion_actual', 'INVALID_JSON{{{');

    expect(obtenerSesionActualService()).toBeNull();
  });
});

// ============================================================
// RT-FE-02 — Access token expirado: renovación automática
// Verifica que renovarSesionService llama a POST /auth/refresh
// y actualiza localStorage con el nuevo token.
// ============================================================
describe('RT-FE-02 — renovarSesionService: renovación automática del access token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('RT-FE-02: llama a POST /auth/refresh con withCredentials: true', async () => {
    mockPost.mockResolvedValueOnce({ data: { token: 'jwt.token.nuevo' } });

    await renovarSesionService();

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {}, { withCredentials: true });
  });

  it('RT-FE-02: actualiza el token en localStorage cuando el refresh es exitoso y existe sesión previa', async () => {
    localStorage.setItem('sesion_actual', JSON.stringify(SESION_MOCK));
    mockPost.mockResolvedValueOnce({ data: { token: 'jwt.token.nuevo' } });

    const resultado = await renovarSesionService();

    expect(resultado).toBe('jwt.token.nuevo');
    const sesionActualizada = JSON.parse(localStorage.getItem('sesion_actual')!);
    expect(sesionActualizada.token).toBe('jwt.token.nuevo');
    expect(sesionActualizada.usuario.correo).toBe('admin@kuhub.cl');
  });

  it('RT-FE-02: retorna el nuevo token sin modificar localStorage si no había sesión previa', async () => {
    mockPost.mockResolvedValueOnce({ data: { token: 'jwt.token.nuevo' } });

    const resultado = await renovarSesionService();

    expect(resultado).toBe('jwt.token.nuevo');
    expect(localStorage.getItem('sesion_actual')).toBeNull();
  });
});

// ============================================================
// RT-FE-03 — Múltiples peticiones concurrentes durante renovación
// Verifica que llamadas simultáneas a renovarSesionService
// resuelven correctamente (el control de la cola isRefreshing
// está en el interceptor de Axios; aquí se prueba a nivel servicio).
// ============================================================
describe('RT-FE-03 — renovarSesionService: llamadas concurrentes al servicio de refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('RT-FE-03: múltiples llamadas concurrentes resuelven cada una con el nuevo token', async () => {
    mockPost.mockResolvedValue({ data: { token: 'jwt.token.nuevo' } });

    const [r1, r2, r3] = await Promise.all([
      renovarSesionService(),
      renovarSesionService(),
      renovarSesionService(),
    ]);

    expect(r1).toBe('jwt.token.nuevo');
    expect(r2).toBe('jwt.token.nuevo');
    expect(r3).toBe('jwt.token.nuevo');
  });
});

// ============================================================
// RT-FE-04 — Refresh fallido: sin cookie o cookie expirada
// Verifica que renovarSesionService retorna null cuando
// POST /auth/refresh falla (interceptor limpia localStorage
// y redirige a /login).
// ============================================================
describe('RT-FE-04 — renovarSesionService: refresh fallido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('RT-FE-04: retorna null cuando POST /auth/refresh responde HTTP 401 (cookie expirada o ausente)', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 401 } });

    const resultado = await renovarSesionService();

    expect(resultado).toBeNull();
  });

  it('RT-FE-04: retorna null cuando hay error de red sin respuesta del servidor', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network Error'));

    const resultado = await renovarSesionService();

    expect(resultado).toBeNull();
  });
});

// ============================================================
// RT-FE-05 — Restauración de sesión al reabrir el navegador
// RT-FE-06 — Sin cookie: usuario debe hacer login nuevamente
// Verifica el flujo que checkAuth (AuthProvider) ejecuta al
// montar la app cuando no hay sesion_actual en localStorage.
// ============================================================
describe('RT-FE-05 y RT-FE-06 — checkAuth: inicialización de sesión al reabrir el navegador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('RT-FE-05: sin sesion_actual, renovarSesionService devuelve token cuando la cookie HttpOnly es válida', async () => {
    mockPost.mockResolvedValueOnce({ data: { token: 'jwt.token.renovado' } });

    // No hay sesión local (simula navegador recién abierto con cookie activa)
    expect(obtenerSesionActualService()).toBeNull();

    const nuevoToken = await renovarSesionService();

    expect(nuevoToken).toBe('jwt.token.renovado');
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {}, { withCredentials: true });
  });

  it('RT-FE-06: sin sesion_actual ni cookie válida, renovarSesionService retorna null (el usuario debe iniciar sesión)', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 401 } });

    // No hay sesión local ni cookie válida
    expect(obtenerSesionActualService()).toBeNull();

    const resultado = await renovarSesionService();

    expect(resultado).toBeNull();
    expect(localStorage.getItem('sesion_actual')).toBeNull();
  });
});

// ============================================================
// RT-FE-07 (servicio) — Logout revoca el refresh token
// Verifica que cerrarSesionService llama a POST /auth/logout y
// elimina sesion_actual de localStorage en cualquier escenario.
// ============================================================
describe('RT-FE-07 — cerrarSesionService: logout y revocación del refresh token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('RT-FE-07a: llama a POST /auth/logout con withCredentials: true', async () => {
    mockPost.mockResolvedValueOnce({});

    await cerrarSesionService();

    expect(mockPost).toHaveBeenCalledWith('/auth/logout', {}, { withCredentials: true });
  });

  it('RT-FE-07b: elimina sesion_actual de localStorage aunque el backend falle', async () => {
    localStorage.setItem('sesion_actual', JSON.stringify(SESION_MOCK));
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    await cerrarSesionService();

    expect(localStorage.getItem('sesion_actual')).toBeNull();
  });

  it('RT-FE-07c: elimina sesion_actual de localStorage cuando el backend confirma el logout', async () => {
    localStorage.setItem('sesion_actual', JSON.stringify(SESION_MOCK));
    mockPost.mockResolvedValueOnce({});

    await cerrarSesionService();

    expect(localStorage.getItem('sesion_actual')).toBeNull();
  });
});

// ============================================================
// RT-FE-07 (hook) y RT-FE-08 — useInactivityTimeout
// Verifica el timeout de 25 min y el warning modal a los 20 min.
// ============================================================
describe('RT-FE-07 y RT-FE-08 — useInactivityTimeout: timeout e inactividad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('RT-FE-07: llama onTimeout tras 25 minutos de inactividad cuando el usuario está autenticado', () => {
    const onTimeout = vi.fn();
    renderHook(() => useInactivityTimeout(onTimeout, true, 25 * 60 * 1000));

    // +10s para que el último tick del intervalo (10s) evalúe el umbral exacto
    vi.advanceTimersByTime(25 * 60 * 1000 + 10_000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('RT-FE-07 (no autenticado): NO llama onTimeout cuando isAuthenticated es false', () => {
    const onTimeout = vi.fn();
    renderHook(() => useInactivityTimeout(onTimeout, false, 25 * 60 * 1000));

    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('RT-FE-08: llama onWarning a los 20 minutos sin haber disparado onTimeout aún', () => {
    const onTimeout = vi.fn();
    const onWarning = vi.fn();
    renderHook(() =>
      useInactivityTimeout(onTimeout, true, 25 * 60 * 1000, onWarning, 20 * 60 * 1000)
    );

    vi.advanceTimersByTime(20 * 60 * 1000 + 10_000);

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('RT-FE-08 (actividad reinicia): una petición API reinicia el contador y retrasa el warning modal', () => {
    const onTimeout = vi.fn();
    const onWarning = vi.fn();
    renderHook(() =>
      useInactivityTimeout(onTimeout, true, 25 * 60 * 1000, onWarning, 20 * 60 * 1000)
    );

    // Avanzar 19 minutos sin llegar al umbral de warning (20 min)
    vi.advanceTimersByTime(19 * 60 * 1000);

    // Simular una petición API que reinicia el contador de inactividad
    act(() => {
      window.dispatchEvent(new Event('api-request'));
    });

    // Avanzar 10 minutos más (solo 10 min desde la última actividad; umbral = 20 min)
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(onWarning).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
