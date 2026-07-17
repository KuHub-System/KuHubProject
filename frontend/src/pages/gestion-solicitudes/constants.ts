export type EstadoSolicitud = 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Procesada' | 'En Pedido';

export interface IDetalleSolicitud {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  observacion?: string | null;
}

export interface ISolicitudGestion {
  id: number;
  idAsignatura: number;
  nombreAsignatura: string;
  idReceta: number;
  nombreReceta: string;
  idSeccion: number;
  nombreSeccion: string;
  nombreDocente: string;
  fechaClase: string;
  horaInicio: string;
  horaFin: string;
  nombreSala: string;
  cantInscritos: number;
  estado: EstadoSolicitud;
  motivoRechazo?: string;
  observacion?: string;
  idPedido?: number | null;
  tieneOrdenPedidoActiva?: boolean;
  detalles: IDetalleSolicitud[];
}

const MESES_RE = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/gi;
const cap = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)).replace(MESES_RE, m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());

export const fmtFecha = (iso: string) => {
  const s = new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  return cap(s);
};

export const ESTADO_CFG: Record<EstadoSolicitud, { color: 'warning' | 'success' | 'danger' | 'default' | 'primary' | 'secondary'; icon: string; label: string }> = {
  Pendiente:  { color: 'warning',   icon: 'lucide:clock',          label: 'Pendiente'  },
  Aceptada:   { color: 'success',   icon: 'lucide:check-circle',   label: 'Aceptada'   },
  Rechazada:  { color: 'danger',    icon: 'lucide:x-circle',       label: 'Rechazada'  },
  Procesada:  { color: 'default',   icon: 'lucide:archive',        label: 'Procesada'  },
  'En Pedido':{ color: 'secondary', icon: 'lucide:shopping-cart',  label: 'En Pedido'  },
};
