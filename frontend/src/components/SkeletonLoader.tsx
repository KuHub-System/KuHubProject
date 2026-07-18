import React from 'react';
import { Skeleton } from '@heroui/react';

const Bar: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <Skeleton className={`rounded-lg ${className}`}>
    <div className={`rounded-lg bg-default-200 dark:bg-default-100/20 ${className}`} />
  </Skeleton>
);

const Circle: React.FC<{ size?: string }> = ({ size = 'w-10 h-10' }) => (
  <Skeleton className={`rounded-full shrink-0 ${size}`}>
    <div className={`rounded-full bg-default-200 dark:bg-default-100/20 ${size}`} />
  </Skeleton>
);

export interface TableSkeletonColumn {
  /** Clase de ancho (p.ej. 'w-[30%]') o 'flex-1' para repartir el espacio restante. */
  width?: string;
  /** Forma del contenido de la celda. */
  shape?: 'text' | 'chip' | 'icons' | 'avatar-text';
}

interface TableSkeletonProps {
  rows?: number;
  /** Número de columnas iguales, o especificación por columna (ancho + forma) para imitar la tabla real. */
  columns?: TableSkeletonColumn[] | number;
}

/** Skeleton de tabla: filas de celdas cuya forma (texto, chip, iconos, avatar+texto) imita la tabla real. */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5 }) => {
  const cols: TableSkeletonColumn[] = typeof columns === 'number'
    ? Array.from({ length: columns }, () => ({ width: 'flex-1', shape: 'text' }))
    : columns;

  return (
    <div className="rounded-xl border border-default-200 dark:border-default-100 overflow-hidden">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`flex items-center gap-4 px-4 py-3 ${r !== rows - 1 ? 'border-b border-default-100 dark:border-default-50/20' : ''}`}
        >
          {cols.map((col, c) => (
            <div key={c} className={`${col.width ?? 'flex-1'} min-w-0 flex items-center gap-2`}>
              {col.shape === 'avatar-text' ? (
                <>
                  <Circle size="w-8 h-8" />
                  <Bar className="h-4 flex-1" />
                </>
              ) : col.shape === 'chip' ? (
                <Bar className="h-6 w-16 rounded-full" />
              ) : col.shape === 'icons' ? (
                <div className="flex gap-2 justify-center w-full">
                  <Circle size="w-7 h-7" />
                  <Circle size="w-7 h-7" />
                </div>
              ) : (
                <Bar className="h-4 w-full" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

interface CardSkeletonProps {
  lines?: number;
  /** Avatar circular a la izquierda (para tarjetas de proveedor/usuario). */
  hasAvatar?: boolean;
  /** Chip/badge alineado a la derecha del encabezado (para estado, contador, etc.). */
  hasBadge?: boolean;
}

/** Skeleton de tarjeta: título (+ avatar opcional) + N líneas de texto (+ badge opcional). */
export const CardSkeleton: React.FC<CardSkeletonProps> = ({ lines = 2, hasAvatar = false, hasBadge = false }) => (
  <div className="rounded-xl border border-default-200 dark:border-default-100 p-4">
    <div className="flex items-start gap-3">
      {hasAvatar && <Circle size="w-11 h-11" />}
      <div className="flex-1 min-w-0 space-y-2">
        <Bar className="h-5 w-1/2" />
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} className="h-3.5 w-full" />
        ))}
      </div>
      {hasBadge && <Bar className="h-6 w-20 rounded-full shrink-0" />}
    </div>
  </div>
);

interface StatSkeletonProps {
  count?: number;
}

/** Skeleton de fila de KPIs: N tarjetas con etiqueta corta + número grande. */
export const StatSkeleton: React.FC<StatSkeletonProps> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-default-200 dark:border-default-100 p-4 space-y-2">
        <Bar className="h-3 w-16" />
        <Bar className="h-7 w-20" />
      </div>
    ))}
  </div>
);

interface ChartSkeletonProps {
  height?: string;
  /** Cantidad de barras del gráfico simulado. */
  bars?: number;
}

/** Skeleton de gráfico: título + barras de altura variable. */
export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ height = 'h-64', bars = 7 }) => (
  <div className={`rounded-xl border border-default-200 dark:border-default-100 p-4 ${height} flex flex-col`}>
    <Bar className="h-4 w-32 mb-4" />
    <div className="flex items-end gap-2 flex-1">
      {Array.from({ length: bars }).map((_, i) => (
        <Skeleton key={i} className="rounded-t-lg flex-1" style={{ height: `${35 + (i % 4) * 15}%` }}>
          <div className="w-full h-full rounded-t-lg bg-default-200 dark:bg-default-100/20" />
        </Skeleton>
      ))}
    </div>
  </div>
);
