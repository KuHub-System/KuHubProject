'use client';
/**
 * DASHBOARD GENERAL — ADMIN / CO_ADMIN
 * Muestra KPIs globales + gráficos de solicitudes y pedidos.
 */

import React from 'react';
import { Card, CardBody, CardHeader, Spinner, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getDashboardAdmin, DashboardAdminData } from '../../services/api-dashboard';

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

// ─── Component ───────────────────────────────────────────────────────────────

export const DashboardGeneral: React.FC = () => {
  const [data, setData] = React.useState<DashboardAdminData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    getDashboardAdmin()
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
        Error al cargar los datos del dashboard.
      </div>
    );
  }

  // Transformar datos para recharts
  const pieData = data.solicitudesPorEstado.map(p => ({ name: p.name, value: p.value, color: p.color }));
  const lineData = data.solicitudesPorDia.map(p => ({ name: p.label, value: p.value }));
  const barData  = data.pedidosPorSemana.map(p => ({ name: p.label, value: p.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── KPI Row 1: solicitudes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Solicitudes Hoy"   value={data.solicitudesToday}  icon="lucide:file-text" />
        <KpiCard title="Esta Semana"        value={data.solicitudesWeek}   icon="lucide:file-text" />
        <KpiCard title="Este Mes"           value={data.solicitudesMonth}  icon="lucide:file-text" />
        <KpiCard title="Total Pedidos"      value={data.totalPedidos}      icon="lucide:shopping-cart" />
      </div>

      {/* ── KPI Row 2: stock + usuarios ── */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          title="Bajo Stock"
          value={data.productosBajoStock}
          icon="lucide:alert-triangle"
          iconColor={data.productosBajoStock > 0 ? 'text-warning-600' : 'text-[#FFB800]'}
          bgColor={data.productosBajoStock > 0 ? 'bg-warning-100' : 'bg-[#FFB800]/10'}
          badge={
            data.productosBajoStock > 0
              ? <Chip size="sm" color="warning" variant="flat">Requiere atención</Chip>
              : undefined
          }
        />
        <KpiCard title="Usuarios Activos" value={data.usuariosActivos} icon="lucide:users" />
      </div>

      {/* ── Alerta cuello de botella ── */}
      {data.solicitudesPendientes > 0 && (
        <div className="flex items-center gap-2 bg-warning-50 border border-warning-200 text-warning-800 rounded-xl p-3">
          <Icon icon="lucide:alert-triangle" width={16} className="shrink-0 text-warning-600" />
          <span className="text-sm font-medium">
            ⚠️ {data.solicitudesPendientes} solicitudes pendientes — posible cuello de botella
          </span>
        </div>
      )}

      {/* ── Charts row: Pie + Line ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie: Estado de Solicitudes */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Estado de Solicitudes</h3>
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

        {/* Line: Solicitudes por Día */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Solicitudes por Día (últimos 30 días)</h3>
          </CardHeader>
          <CardBody className="p-4">
            {lineData.length === 0 ? (
              <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#FFB800" strokeWidth={2} dot={false} name="Solicitudes" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Bar: Pedidos por Semana ── */}
      <Card className="shadow-sm border border-divider">
        <CardHeader className="pb-0 pt-4 px-5">
          <h3 className="text-sm font-semibold text-default-700">Pedidos por Semana</h3>
        </CardHeader>
        <CardBody className="p-4">
          {barData.length === 0 ? (
            <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#FFB800" name="Pedidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};
