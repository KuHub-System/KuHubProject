'use client';
/**
 * DASHBOARD INVENTARIO — ENCARGADO_BODEGA / ASISTENTE_BODEGA
 * Muestra KPIs de stock, productos críticos y gráficos de movimientos.
 */

import React from 'react';
import { Card, CardBody, CardHeader, Spinner, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getDashboardInventario, DashboardInventarioData, ProductoCritico } from '../../services/api-dashboard';

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

// ─── Productos Críticos Table ─────────────────────────────────────────────────

const ProductosCriticosTable: React.FC<{ productos: ProductoCritico[] }> = ({ productos }) => {
  if (productos.length === 0) {
    return (
      <p className="text-center text-default-400 py-8 text-sm">No hay productos críticos registrados.</p>
    );
  }

  const thClass = "py-2 px-3 text-center text-xs font-semibold text-default-500 uppercase tracking-wider";
  const tdBase  = "py-2 px-3 text-center max-w-0";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[13%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-divider">
            <th className={thClass}>Producto</th>
            <th className={thClass}>Categoría</th>
            <th className={thClass}>Stock</th>
            <th className={thClass}>Stock Mín</th>
            <th className={thClass}>Unidad</th>
            <th className={thClass}>%</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, i) => {
            const ratio = p.stockLimit > 0 ? p.stock / p.stockLimit : 0;
            const isCritical = ratio < 0.5;
            return (
              <tr key={i} className="border-b border-divider/50 hover:bg-default-50 transition-colors">
                <td className={`${tdBase} font-medium ${isCritical ? 'text-danger-600' : 'text-default-800'}`}>
                  <span className="block truncate" title={p.nombreProducto}>{p.nombreProducto}</span>
                </td>
                <td className={`${tdBase} text-default-500`}>
                  <span className="block truncate" title={p.categoria}>{p.categoria}</span>
                </td>
                <td className={`${tdBase} font-semibold ${isCritical ? 'text-danger-600' : 'text-default-800'}`}>
                  {p.stock.toFixed(1)}
                </td>
                <td className={`${tdBase} text-default-500`}>
                  {p.stockLimit.toFixed(1)}
                </td>
                <td className={`${tdBase} text-default-500`}>
                  <span className="block truncate" title={p.unidad}>{p.unidad}</span>
                </td>
                <td className={tdBase}>
                  <div className="flex justify-center">
                    <Chip size="sm" color={isCritical ? 'danger' : 'warning'} variant="flat">
                      {p.stockLimit > 0 ? `${((p.stock / p.stockLimit) * 100).toFixed(0)}%` : 'N/A'}
                    </Chip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export const DashboardInventarioView: React.FC = () => {
  const [data, setData] = React.useState<DashboardInventarioData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    getDashboardInventario()
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
        Error al cargar los datos del dashboard de inventario.
      </div>
    );
  }

  const stockCatData   = data.stockPorCategoria.map(p => ({ name: p.label, value: p.value }));
  const movDiaData     = data.movimientosPorDia.map(p => ({ name: p.label, value: p.value }));
  const topUsadosData  = data.topProductosUsados.map(p => ({ name: p.label, value: p.value }));
  const topMermaData   = data.topProductosMerma.map(p => ({ name: p.label, value: p.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Total Productos"
          value={data.totalProductos}
          icon="lucide:package"
        />
        <KpiCard
          title="Stock Total"
          value={data.stockTotal.toFixed(1)}
          icon="lucide:layers"
        />
        <KpiCard
          title="Bajo Stock"
          value={data.productosBajoStock}
          icon="lucide:alert-triangle"
          iconColor={data.productosBajoStock > 0 ? 'text-warning-600' : 'text-[#FFB800]'}
          bgColor={data.productosBajoStock > 0 ? 'bg-warning-100' : 'bg-[#FFB800]/10'}
          badge={
            data.productosBajoStock > 0
              ? <Chip size="sm" color="warning" variant="flat">Atención</Chip>
              : undefined
          }
        />
        <KpiCard
          title="Movimientos Hoy"
          value={data.movimientosHoy}
          icon="lucide:arrow-right-left"
        />
      </div>

      {/* ── Productos Críticos ── */}
      <Card className="shadow-sm border border-divider">
        <CardHeader className="pb-0 pt-4 px-5 flex items-center gap-2">
          <Icon icon="lucide:alert-octagon" width={16} className="text-danger-500" />
          <h3 className="text-sm font-semibold text-default-700">Productos Críticos</h3>
        </CardHeader>
        <CardBody className="p-4">
          <ProductosCriticosTable productos={data.productosCriticos} />
        </CardBody>
      </Card>

      {/* ── Stock por Categoría ── */}
      <Card className="shadow-sm border border-divider">
        <CardHeader className="pb-0 pt-4 px-5">
          <h3 className="text-sm font-semibold text-default-700">Stock por Categoría</h3>
        </CardHeader>
        <CardBody className="p-4">
          {stockCatData.length === 0 ? (
            <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockCatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#FFB800" name="Stock" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* ── Movimientos por Día ── */}
      <Card className="shadow-sm border border-divider">
        <CardHeader className="pb-0 pt-4 px-5">
          <h3 className="text-sm font-semibold text-default-700">Movimientos por Día (14 días)</h3>
        </CardHeader>
        <CardBody className="p-4">
          {movDiaData.length === 0 ? (
            <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={movDiaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={false} name="Movimientos" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* ── Top 5 Usados + Top 5 Merma ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Usados */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Top 5 Productos Más Usados (30d)</h3>
          </CardHeader>
          <CardBody className="p-4">
            {topUsadosData.length === 0 ? (
              <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart layout="vertical" data={topUsadosData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22C55E" name="Cantidad usada" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Top Merma */}
        <Card className="shadow-sm border border-divider">
          <CardHeader className="pb-0 pt-4 px-5">
            <h3 className="text-sm font-semibold text-default-700">Top 5 Merma (30d)</h3>
          </CardHeader>
          <CardBody className="p-4">
            {topMermaData.length === 0 ? (
              <p className="text-center text-default-400 py-10 text-sm">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart layout="vertical" data={topMermaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EF4444" name="Merma" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </motion.div>
  );
};
