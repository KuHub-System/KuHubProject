'use client';
/**
 * DASHBOARD GESTOR — GESTOR_PEDIDOS
 * Muestra KPIs de solicitudes, distribución por estado y rechazos recientes.
 */

import React from 'react';
import { Card, CardBody, CardHeader, Spinner, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  title,
  value,
  icon,
  iconColor = 'text-[#FFB800]',
  bgColor = 'bg-[#FFB800]/10',
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

const RechazadasTable: React.FC<{ items: SolicitudRechazada[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <p className="text-center text-default-400 py-8 text-sm">No hay solicitudes rechazadas recientes.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-2 px-3 text-xs font-semibold text-default-500 uppercase tracking-wider">ID</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-default-500 uppercase tracking-wider">Motivo</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-default-500 uppercase tracking-wider">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-divider/50 hover:bg-default-50 transition-colors">
              <td className="py-2 px-3">
                <Chip size="sm" color="danger" variant="flat">#{item.idSolicitud}</Chip>
              </td>
              <td className="py-2 px-3 text-default-600 max-w-xs truncate">{item.motivo || '—'}</td>
              <td className="py-2 px-3 text-default-500 whitespace-nowrap">{item.fechaSolicitada}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export const DashboardGestor: React.FC = () => {
  const [data, setData] = React.useState<DashboardGestorData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const navigate = useNavigate();
  const { hasSpecificPermission } = useAuth();
  const puedeVerGestionSolicitudes = hasSpecificPermission('gestion-solicitudes');

  React.useEffect(() => {
    getDashboardGestor()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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

  const pieData         = data.solicitudesPorEstado.map(p => ({ name: p.name, value: p.value, color: p.color }));
  const asignaturaData  = data.solicitudesPorAsignatura.map(p => ({ name: p.label, value: p.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Solicitudes"
          value={data.totalSolicitudes}
          icon="lucide:file-text"
        />
        <KpiCard
          title="Pendientes"
          value={data.pendientes}
          icon="lucide:clock"
          iconColor={data.pendientes > 0 ? 'text-warning-600' : 'text-[#FFB800]'}
          bgColor={data.pendientes > 0 ? 'bg-warning-100' : 'bg-[#FFB800]/10'}
        />
        <KpiCard
          title="Aceptadas"
          value={data.aceptadas}
          icon="lucide:check-circle"
          iconColor="text-success-600"
          bgColor="bg-success-100"
        />
        <KpiCard
          title="Procesadas"
          value={data.procesadas}
          icon="lucide:package-check"
          iconColor="text-primary-600"
          bgColor="bg-primary-100"
        />
        <KpiCard
          title="Rechazadas"
          value={data.rechazadas}
          icon="lucide:x-circle"
          iconColor="text-danger-600"
          bgColor="bg-danger-100"
        />
      </div>

      {/* ── Tiempo Promedio ── */}
      <Card className="shadow-sm border border-divider">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:clock" width={20} className="text-[#FFB800]" />
            </div>
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wider">Tiempo Promedio de Procesamiento</p>
              <p className="text-xl font-bold text-default-800">
                {data.tiempoPromedioHoras.toFixed(1)} horas
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Charts: Pie + Bar Horizontal ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie: Distribución por Estado */}
        <Card
          className={`shadow-sm border border-divider transition-shadow ${puedeVerGestionSolicitudes ? 'cursor-pointer hover:shadow-md hover:border-warning-300' : ''}`}
          onClick={puedeVerGestionSolicitudes ? () => navigate('/gestion-solicitudes') : undefined}
        >
          <CardHeader className="pb-0 pt-4 px-5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-default-700">Distribución por Estado</h3>
            {puedeVerGestionSolicitudes && (
              <span className="text-xs text-default-400 flex items-center gap-1">
                <Icon icon="lucide:external-link" width={12} />
                Ver gestión
              </span>
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
        </CardHeader>
        <CardBody className="p-4">
          <RechazadasTable items={data.rechazadasRecientes} />
        </CardBody>
      </Card>
    </motion.div>
  );
};
