'use client';
/**
 * DASHBOARD GESTOR — GESTOR_PEDIDOS
 * Muestra KPIs de solicitudes, distribución por estado y rechazos recientes.
 */

import React from 'react';
import {
  Card, CardBody, CardHeader, Spinner, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, useDisclosure,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getDashboardGestor, DashboardGestorData, SolicitudRechazada } from '../../services/api-dashboard';
import { useAuth } from '../../contexts/auth-context';

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  icon: string;
  iconColor?: string;
  bgColor?: string;
  badge?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title, value, icon,
  iconColor = 'text-[#FFB800]',
  bgColor   = 'bg-[#FFB800]/10',
  badge,
}) => (
  <Card className="shadow-sm border border-divider">
    <CardBody className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-3xl font-bold text-default-800">{value}</p>
          {badge && <div className="mt-1">{badge}</div>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon icon={icon} width={22} className={iconColor} />
        </div>
      </div>
    </CardBody>
  </Card>
);

// ─── Rechazadas Table ─────────────────────────────────────────────────────────

const RechazadasTable: React.FC<{
  items: SolicitudRechazada[];
  onSelect: (item: SolicitudRechazada) => void;
}> = ({ items, onSelect }) => {
  if (items.length === 0) {
    return (
      <p className="text-center text-default-400 py-8 text-sm">No hay solicitudes rechazadas recientes.</p>
    );
  }

  const thClass = 'py-2 px-3 text-center text-xs font-semibold text-default-500 uppercase tracking-wider';
  const tdBase  = 'py-2 px-3 text-center max-w-0';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[55%]" />
          <col className="w-[20%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-divider">
            <th className={thClass}>ID</th>
            <th className={thClass}>Motivo</th>
            <th className={thClass}>Asignatura</th>
            <th className={thClass}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={i}
              className="border-b border-divider/50 hover:bg-danger-50/40 transition-colors cursor-pointer"
              onClick={() => onSelect(item)}
            >
              <td className={tdBase}>
                <div className="flex justify-center">
                  <Chip size="sm" color="danger" variant="flat">#{item.idSolicitud}</Chip>
                </div>
              </td>
              <td className={`${tdBase} text-default-600`}>
                <span className="block truncate" title={item.motivo}>{item.motivo || '—'}</span>
              </td>
              <td className={`${tdBase} text-default-500`}>
                <span className="block truncate" title={item.nombreAsignatura}>{item.nombreAsignatura || '—'}</span>
              </td>
              <td className={`${tdBase} text-default-500 whitespace-nowrap`}>
                {item.fechaSolicitada}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Detalle Modal ────────────────────────────────────────────────────────────

const DetalleRechazadaModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  item: SolicitudRechazada | null;
  onVerGestion: () => void;
}> = ({ isOpen, onClose, item, onVerGestion }) => {
  if (!item) return null;
  const esAutomatico = item.motivo?.includes('automáticamente');

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="lg" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex items-center gap-2 border-b border-default-100 pb-3">
              <div className="p-2 rounded-xl bg-danger-100 dark:bg-danger-900/30">
                <Icon icon="lucide:x-circle" width={18} className="text-danger-500" />
              </div>
              <span className="font-bold text-secondary dark:text-foreground">Detalle de Solicitud</span>
              <Chip size="sm" color="danger" variant="flat" className="ml-auto mr-6 font-semibold">
                Rechazada
              </Chip>
            </ModalHeader>

            <ModalBody className="py-5 space-y-4">
              {/* Cabecera: asignatura, sección, fecha */}
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-default-50 dark:bg-default-100/10 rounded-xl">
                <Icon icon="lucide:graduation-cap" width={13} className="text-default-400 shrink-0" />
                <p className="text-xs text-default-500 font-medium truncate">{item.nombreAsignatura}</p>
                <span className="text-default-300">·</span>
                <span className="text-xs font-mono text-default-500">§{item.nombreSeccion}</span>
                <span className="text-default-300">·</span>
                <span className="text-xs text-default-400">{item.fechaSolicitada}</span>
              </div>

              {/* Grid de info */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: 'lucide:book-open', label: 'Receta',   val: item.nombreReceta,   color: 'text-warning-500',  bg: 'bg-warning-50 dark:bg-warning-900/20'  },
                  { icon: 'lucide:user',       label: 'Docente',  val: item.nombreDocente,  color: 'text-primary-500',  bg: 'bg-primary-50 dark:bg-primary-900/20'  },
                  { icon: 'lucide:hash',        label: 'ID Sol.',  val: `#${item.idSolicitud}`, color: 'text-default-400', bg: 'bg-default-100 dark:bg-default-50/10' },
                  { icon: 'lucide:calendar',   label: 'Fecha',    val: item.fechaSolicitada, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-900/20' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-default-100 dark:border-default-50/20 bg-white dark:bg-content1">
                    <div className={`p-1.5 rounded-lg shrink-0 ${r.bg}`}>
                      <Icon icon={r.icon} width={14} className={r.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-default-400 font-semibold leading-none mb-0.5">{r.label}</p>
                      <p className="text-sm font-semibold text-default-700 dark:text-default-200 truncate">{r.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Motivo de rechazo */}
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                <Icon icon={esAutomatico ? 'lucide:clock-alert' : 'lucide:alert-circle'} width={15} className="text-danger-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-danger-500 font-semibold mb-0.5">
                    {esAutomatico ? 'Rechazo automático del sistema' : 'Motivo de rechazo'}
                  </p>
                  <p className="text-sm italic text-danger-700 dark:text-danger-300">{item.motivo}</p>
                </div>
              </div>

              {esAutomatico && (
                <p className="text-xs text-default-400 text-center">
                  Esta solicitud fue rechazada automáticamente por el sistema y no puede revertirse.
                </p>
              )}
            </ModalBody>

            <ModalFooter className="gap-2">
              <Button variant="light" onPress={close}>Cerrar</Button>
              <Button
                color="primary"
                variant="flat"
                startContent={<Icon icon="lucide:external-link" width={14} />}
                onPress={() => { close(); onVerGestion(); }}
              >
                Ver en Gestión
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export const DashboardGestor: React.FC = () => {
  const [data, setData]       = React.useState<DashboardGestorData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState(false);
  const [selItem, setSelItem] = React.useState<SolicitudRechazada | null>(null);
  const detalle = useDisclosure();
  const history = useHistory();
  const { hasSpecificPermission } = useAuth();
  const puedeVerGestion = hasSpecificPermission('gestion-solicitudes');

  React.useEffect(() => {
    getDashboardGestor()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectRechazada = (item: SolicitudRechazada) => {
    setSelItem(item);
    detalle.onOpen();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" color="warning" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-default-400">
        Error al cargar los datos del dashboard de gestor.
      </div>
    );
  }

  const pieData        = data.solicitudesPorEstado.map(p => ({ name: p.name, value: p.value, color: p.color }));
  const asignaturaData = data.solicitudesPorAsignatura.map(p => ({ name: p.label, value: p.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total"       value={data.totalSolicitudes} icon="lucide:file-text" />
        <KpiCard
          title="Pendientes"
          value={data.pendientes}
          icon="lucide:clock"
          iconColor={data.pendientes > 0 ? 'text-warning-600' : 'text-[#FFB800]'}
          bgColor={data.pendientes > 0 ? 'bg-warning-100' : 'bg-[#FFB800]/10'}
        />
        <KpiCard title="Aceptadas"  value={data.aceptadas}  icon="lucide:check-circle" iconColor="text-success-600"   bgColor="bg-success-100"   />
        <KpiCard title="En Pedido"  value={data.enPedido}   icon="lucide:shopping-cart" iconColor="text-violet-600"   bgColor="bg-violet-100"   />
        <KpiCard title="Procesadas" value={data.procesadas} icon="lucide:package-check" iconColor="text-primary-600"  bgColor="bg-primary-100"  />
        <KpiCard title="Rechazadas" value={data.rechazadas} icon="lucide:x-circle"      iconColor="text-danger-600"   bgColor="bg-danger-100"   />
      </div>

      {/* ── Tiempo Promedio ── */}
      <Card className="shadow-sm border border-divider">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:clock" width={20} className="text-[#FFB800]" />
            </div>
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wider">
                Tiempo Promedio de Procesamiento
                <span className="normal-case ml-1 text-default-300">(creación → aceptación)</span>
              </p>
              <p className="text-xl font-bold text-default-800">
                {data.tiempoPromedioHoras > 0
                  ? `${data.tiempoPromedioHoras.toFixed(1)} horas`
                  : <span className="text-sm font-normal text-default-400">Sin datos suficientes</span>
                }
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Charts: Pie + Bar Horizontal ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie: Distribución por Estado */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-default-700">Distribución por Estado</h3>
            {puedeVerGestion && (
              <Button
                size="sm"
                variant="light"
                color="primary"
                startContent={<Icon icon="lucide:external-link" width={13} />}
                onPress={() => history.push('/gestion-solicitudes')}
                className="text-xs h-7"
              >
                Ver gestión
              </Button>
            )}
          </CardHeader>
          <CardBody className="p-4">
            {pieData.length === 0 ? (
              <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Bar Horizontal: Top Asignaturas */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Top Asignaturas con más Solicitudes</h3>
          </CardHeader>
          <CardBody className="p-4">
            {asignaturaData.length === 0 ? (
              <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart layout="vertical" data={asignaturaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FFB800" name="Solicitudes" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Rechazadas Recientes ── */}
      <Card className="shadow-sm border border-divider">
        <CardHeader className="pb-0 pt-4 px-5 flex items-center gap-2">
          <Icon icon="lucide:x-circle" width={16} className="text-danger-500" />
          <h3 className="text-sm font-semibold text-default-700">Rechazadas Recientes</h3>
          <span className="text-xs text-default-400 ml-2">(clic en una fila para ver detalle)</span>
        </CardHeader>
        <CardBody className="p-4">
          <RechazadasTable items={data.rechazadasRecientes} onSelect={handleSelectRechazada} />
        </CardBody>
      </Card>

      {/* ── Modal Detalle ── */}
      <DetalleRechazadaModal
        isOpen={detalle.isOpen}
        onClose={detalle.onClose}
        item={selItem}
        onVerGestion={() => history.push('/gestion-solicitudes')}
      />
    </motion.div>
  );
};
