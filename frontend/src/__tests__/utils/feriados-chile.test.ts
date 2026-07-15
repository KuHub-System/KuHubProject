import { describe, it, expect } from 'vitest';
import { calcularPascua, esFeriadoChile, nombreFeriadoChile } from '../../utils/feriados-chile';

describe('feriados-chile', () => {
  describe('calcularPascua', () => {
    it('calcula Domingo de Pascua para años conocidos', () => {
      expect(calcularPascua(2024)).toEqual(new Date(2024, 2, 31)); // 31 marzo 2024
      expect(calcularPascua(2025)).toEqual(new Date(2025, 3, 20)); // 20 abril 2025
      expect(calcularPascua(2026)).toEqual(new Date(2026, 3, 5));  // 5 abril 2026
    });
  });

  describe('nombreFeriadoChile / esFeriadoChile', () => {
    it('reconoce un feriado fijo (Navidad)', () => {
      const navidad = new Date(2026, 11, 25);
      expect(nombreFeriadoChile(navidad)).toBe('Navidad');
      expect(esFeriadoChile(navidad)).toBe(true);
    });

    it('reconoce Año Nuevo', () => {
      const anoNuevo = new Date(2026, 0, 1);
      expect(nombreFeriadoChile(anoNuevo)).toBe('Año Nuevo');
    });

    it('reconoce Viernes Santo y Sábado Santo derivados de Pascua 2026 (5 abril)', () => {
      const viernesSanto = new Date(2026, 3, 3);
      const sabadoSanto = new Date(2026, 3, 4);
      expect(nombreFeriadoChile(viernesSanto)).toBe('Viernes Santo');
      expect(nombreFeriadoChile(sabadoSanto)).toBe('Sábado Santo');
    });

    it('retorna null para un día hábil normal', () => {
      const diaHabil = new Date(2026, 2, 10); // 10 de marzo, martes cualquiera
      expect(nombreFeriadoChile(diaHabil)).toBeNull();
      expect(esFeriadoChile(diaHabil)).toBe(false);
    });
  });
});
