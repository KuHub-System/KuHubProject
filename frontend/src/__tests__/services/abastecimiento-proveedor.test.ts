import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================
// HOISTED: mock del cliente HTTP (config/Axios)
// ============================================
const { mockGet, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('../../config/Axios', () => ({
  default: { get: mockGet, patch: mockPatch, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import {
  obtenerAbastecimientoConfirmadoService,
  marcarEntregadosMasivoService,
} from '../../services/proveedor-service';

// ============================================
// SUITE — Abastecimiento de Proveedores (entrada a Inventario / Bodega de Tránsito)
// ============================================
describe('Abastecimiento de Proveedores (servicio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { ordenes: [] } });
    mockPatch.mockResolvedValue({ data: 3 });
  });

  // ABP-01
  it('ABP-01: por defecto solicita el abastecimiento de tipo INVENTARIO (entrada al inventario)', async () => {
    await obtenerAbastecimientoConfirmadoService();
    expect(mockGet).toHaveBeenCalledWith(
      '/orden-pedido/abastecimiento',
      { params: { tipoAbastecimiento: 'INVENTARIO' } }
    );
  });

  // ABP-02
  it('ABP-02: solicita el abastecimiento de tipo BODEGA_TRANSITO cuando se indica', async () => {
    await obtenerAbastecimientoConfirmadoService(undefined, 'BODEGA_TRANSITO');
    expect(mockGet).toHaveBeenCalledWith(
      '/orden-pedido/abastecimiento',
      { params: { tipoAbastecimiento: 'BODEGA_TRANSITO' } }
    );
  });

  // ABP-03
  it('ABP-03: incluye fechaHasta en los params cuando se provee', async () => {
    await obtenerAbastecimientoConfirmadoService('2026-06-30', 'INVENTARIO');
    expect(mockGet).toHaveBeenCalledWith(
      '/orden-pedido/abastecimiento',
      { params: { tipoAbastecimiento: 'INVENTARIO', fechaHasta: '2026-06-30' } }
    );
  });

  // ABP-04
  it('ABP-04: marcarEntregadosMasivoService marca como entregados los detalles al confirmar la entrada', async () => {
    const filas = await marcarEntregadosMasivoService([10, 11, 12]);
    expect(mockPatch).toHaveBeenCalledWith('/orden-pedido/detalles/entregar', [10, 11, 12]);
    expect(filas).toBe(3);
  });

  // ABP-05
  it('ABP-05: propaga un error legible si falla la carga del abastecimiento', async () => {
    mockGet.mockRejectedValueOnce({ response: { data: { message: 'Backend caído' } } });
    await expect(obtenerAbastecimientoConfirmadoService()).rejects.toThrow('Backend caído');
  });
});
