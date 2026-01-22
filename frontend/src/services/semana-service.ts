/**
 * SERVICIO DE SEMANAS
 * 
 * Ubicación: src/services/semana-service.ts
 */

import axios from '../config/Axios';
import { ISemana } from '../types/semana.types';

/**
 * Obtiene las semanas activas para el año en curso.
 * Endpoint: GET /api/v1/semanas/find-week-active-for-year/
 */
/**
* Obtiene las semanas activas para el año.
* Lógica Frontend: 
* 1. Genera 18 semanas a partir del primer lunes de Marzo (02/03/2026).
* 2. Filtra las semanas que ya pasaron (fechaFin < hoy).
*/
export const obtenerSemanasActivasService = async (anio: number = new Date().getFullYear()): Promise<ISemana[]> => {
    // Simular retardo de red
    // await new Promise(resolve => setTimeout(resolve, 500)); 

    const semanas: ISemana[] = [];

    // Configuración: Inicio clases 02 de Marzo 2026 (Lunes)
    // Nota: Los meses en JS son 0-indexados (0 = Enero, 2 = Marzo)
    const fechaInicioClases = new Date(anio, 2, 2);

    // Generar 18 semanas
    for (let i = 1; i <= 18; i++) {
        // Calcular inicio de semana: fechaInicio + (i-1) semanas
        const inicio = new Date(fechaInicioClases);
        inicio.setDate(fechaInicioClases.getDate() + (i - 1) * 7);

        // Calcular fin de semana: inicio + 6 días
        const fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);

        semanas.push({
            idSemana: i, // ID ficticio
            numeroSemana: i,
            fechaInicio: inicio.toISOString(),
            fechaFin: fin.toISOString(),
            anio: anio,
            semestre: 1, // Asumimos semestre 1
            activo: true
        });
    }

    // Filtrar: "Trae del sysdate hasta el fin"
    // Es decir, mostrar semanas cuyo fin sea HOY o después.
    // Opcionalmente, podemos mostrar la semana actual aunque ya haya empezado.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const semanasActivas = semanas.filter(semana => {
        const finSemana = new Date(semana.fechaFin);
        finSemana.setHours(0, 0, 0, 0);
        return finSemana >= hoy;
    });

    console.log(`📅 Semanas generadas: ${semanas.length}. Activas (futuras/presentes): ${semanasActivas.length}`);

    return semanasActivas;
};
