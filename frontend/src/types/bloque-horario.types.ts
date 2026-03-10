/**
 * INTERFACE PARA BLOQUE HORARIO
 */
export interface IBloqueHorario {
    idBloque: number;
    numeroBloque: number;
    horaInicio: string; // Formato "HH:mm:ss"
    horaFin: string;    // Formato "HH:mm:ss"
}
