'use client';
/**
 * DASHBOARD RECETAS — PROFESOR_A_CARGO / DOCENTE
 * Muestra KPIs de recetas, distribución por estado y top de ingredientes.
 */

import React from 'react';
import { Card, CardBody, CardHeader, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getDashboardPedidoSemanalBodega, DashboardPedidoSemanalBodegaData } from '../../services/api-dashboard';

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  icon: string;
  iconColor?: string;
  bgColor?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  iconColor = 'text-[#FFB800]',
  bgColor = 'bg-[#FFB800]/10',
}) => (
  <Card className="shadow-sm border border-divider">
    <CardBody className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-3xl font-bold text-default-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon icon={icon} width={22} className={iconColor} />
        </div>
      </div>
    </CardBody>
  </Card>
);

// ─── Component ───────────────────────────────────────────────────────────────

export const DashboardPedidoSemanalBodegaView: React.FC = () => {
  const [data, setData] = React.useState<DashboardPedidoSemanalBodegaData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    getDashboardPedidoSemanalBodega()
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
        Error al cargar los datos del dashboard de pedidos.
      </div>
    );
  }

  const pieData          = data.recetasPorEstado.map(p => ({ name: p.name, value: p.value, color: p.color }));
  const ingredientesData = data.topIngredientes.map(p => ({ name: p.label, value: p.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Pedidos Activos"
          value={data.recetasActivas}
          icon="lucide:package-check"
          iconColor="text-success-600"
          bgColor="bg-success-100"
        />
        <KpiCard
          title="Pedidos Inactivos"
          value={data.recetasInactivas}
          icon="lucide:pause"
          iconColor="text-default-400"
          bgColor="bg-default-100"
        />
        <KpiCard
          title="Total Pedidos"
          value={data.recetasTotal}
          icon="lucide:package"
        />
      </div>

      {/* ── Insight card ── */}
      {data.topIngredientes.length > 0 && (
        <Card className="shadow-sm border border-divider bg-[#FFB800]/5">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFB800]/20 flex items-center justify-center shrink-0">
                <Icon icon="lucide:lightbulb" width={20} className="text-[#FFB800]" />
              </div>
              <div>
                <p className="text-xs text-default-400 uppercase tracking-wider">Ingrediente más usado en pedidos activos</p>
                <p className="text-lg font-semibold text-default-800">{data.topIngredientes[0]?.label}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Charts: Pie + Bar Horizontal ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie: Estado de Recetas */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Estado de Pedidos</h3>
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

        {/* Bar Horizontal: Top 10 Ingredientes */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Top 10 Ingredientes en Pedidos Activos</h3>
          </CardHeader>
          <CardBody className="p-4">
            {ingredientesData.length === 0 ? (
              <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart layout="vertical" data={ingredientesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FFB800" name="Frecuencia" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </motion.div>
  );
};
