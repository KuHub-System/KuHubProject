/**
 * INTERFACES PARA SEMANAS ACADÉMICAS
 */

export interface ISemana {
  idSemana: number;
  nombreSemana: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  anio: number;
  semestre: number;
}

export interface IWeekGeneratorDTO {
  fechaInicio: string; // YYYY-MM-DD (debe ser lunes)
  semestre: number;    // 1 o 2 — el backend calcula las 18 semanas automáticamente
}
