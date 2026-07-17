import { IBulkBodegaListing } from '../../services/inventario/bodega-transito-service';

export const BLOQUES_HORARIOS: Record<number, string> = {
  1: '8:01 - 8:40', 2: '8:41 - 9:20', 3: '9:31 - 10:10', 4: '10:11 - 10:50',
  5: '11:01 - 11:40', 6: '11:41 - 12:20', 7: '12:31 - 13:10', 8: '13:11 - 13:50',
  9: '14:01 - 14:40', 10: '14:41 - 15:20', 11: '15:31 - 16:10', 12: '16:11 - 16:50',
  13: '17:01 - 17:40', 14: '17:41 - 18:20', 15: '18:21 - 19:00', 16: '19:11 - 19:50',
  17: '19:51 - 20:30', 18: '20:41 - 21:20', 19: '21:21 - 22:00', 20: '22:11 - 22:50'
};

export const getHorarioString = (inicio: number, fin: number) => {
  const start = BLOQUES_HORARIOS[inicio]?.split(' - ')[0] || '';
  const end = BLOQUES_HORARIOS[fin]?.split(' - ')[1] || '';
  return start && end ? `${start} - ${end}` : 'Horario no definido';
};

// Callback que EntregaSalaCard notifica al padre cuando un item cambia de estado abierto/cerrado
export type ExpandChangeCallback = (idSolicitud: number, isOpen: boolean, esProcesado: boolean) => void;

export const getWeekKey = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().slice(0, 10);
};

export const getWeekRange = (date: Date): { fechaInicio: string; fechaFin: string } => {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    fechaInicio: monday.toISOString().slice(0, 10),
    fechaFin:    sunday.toISOString().slice(0, 10),
  };
};

export const fmtCantidadEntrega = (n: number): string =>
  new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);

export interface ItemBodegaMasivo {
  id: string;
  producto: IBulkBodegaListing;
  delta: number;
  motivo: string;
  idDetalleOrdenPedido?: number;
  // Cantidad que provino del Abastecimiento de Proveedores (baseline cargado).
  // Lo "extra" sobre este valor (manual o aumento) puede ir a stock_disponible.
  cargadoAbastecimiento?: number;
  idOrdenPedido?: number;
  idPedido?: number;
}

export const MOTIVOS_BODEGA = ['ENTRADA_BODEGA', 'SALIDA_BODEGA', 'AJUSTE_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'] as const;
export const MOTIVO_LABEL: Record<string, string> = {
  ENTRADA_BODEGA: 'Entrada',
  SALIDA_BODEGA:  'Salida',
  AJUSTE_BODEGA:  'Ajuste',
  MERMA_BODEGA:   'Merma',
  DEVOLUCION:     'Devolución',
};
