import React from 'react';
import { Button, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';

export type RielColor = 'primary' | 'secondary' | 'warning' | 'danger' | 'success';

// Tailwind necesita las clases completas de forma literal en el código para no purgarlas en build.
const SHADOW_ACTIVO: Record<RielColor, string> = {
  primary: 'shadow-lg shadow-primary/30',
  secondary: 'shadow-lg shadow-secondary/30',
  warning: 'shadow-lg shadow-warning/30',
  danger: 'shadow-lg shadow-danger/30',
  success: 'shadow-lg shadow-success/30',
};

export interface RielNavegacionItem {
  key: string;
  label: string;
  icon: string;
  /** Color al estar activo. Default 'primary'. */
  color?: RielColor;
  /** Se oculta el item si es false (ej. control de permisos). Default true. */
  visible?: boolean;
  /** Contador opcional junto al item (ej. pedidos pendientes). Se oculta si es <= 0. */
  badge?: number;
}

export interface RielNavegacionProps {
  items: RielNavegacionItem[];
  activeKey: string;
  onChange: (key: string) => void;
  /**
   * true para páginas con scroll de documento normal: los íconos quedan
   * pegados (sticky) mientras se hace scroll. false para layouts de altura
   * fija con scroll interno (ej. "flex h-[calc(100vh-76px)] overflow-hidden"),
   * donde el riel ya ocupa el alto completo sin necesitar sticky.
   * Default false.
   */
  sticky?: boolean;
  /**
   * Clases extra para el wrapper externo (ej. "-mr-10" para bledir hasta el
   * borde en páginas de scroll de documento, o "-mr-6" a nivel de la fila
   * en layouts de altura fija con overflow-hidden -- ver convenciones.md).
   */
  className?: string;
}

/**
 * Riel de navegación vertical fijo al borde derecho del contenido, usado
 * para alternar entre 2+ "vistas" dentro de una misma página (ver
 * gestion-proveedores.tsx, gestion-academica.tsx, bodega-transito.tsx).
 *
 * El margen/bleed hacia el borde derecho depende de si el ancestro de la
 * página tiene overflow-hidden (ver docs/arquitectura/convenciones.md) --
 * pásalo vía `className`, este componente no lo asume.
 */
const RielNavegacion: React.FC<RielNavegacionProps> = ({ items, activeKey, onChange, sticky = false, className = '' }) => {
  const visibles = items.filter(item => item.visible !== false);
  if (visibles.length === 0) return null;

  const contenido = (
    <>
      {visibles.map(item => {
        const activo = activeKey === item.key;
        const color = item.color ?? 'primary';
        return (
          <React.Fragment key={item.key}>
            <Tooltip content={item.label} placement="left">
              <Button
                isIconOnly
                variant={activo ? 'solid' : 'light'}
                color={activo ? color : 'default'}
                onPress={() => onChange(item.key)}
                className={`w-12 h-12 rounded-2xl transition-all duration-300 ${activo ? SHADOW_ACTIVO[color] : 'text-default-400 hover:bg-default-100'}`}
              >
                <Icon icon={item.icon} width={22} />
              </Button>
            </Tooltip>
            {!!item.badge && item.badge > 0 && !activo && (
              <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-[10px] font-bold rounded-full">
                {item.badge}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <div className={`w-[70px] shrink-0 bg-white dark:bg-content1 border-l border-default-200 dark:border-default-100 shadow-[-4px_0_15px_rgba(0,0,0,0.02)] self-stretch ${className}`}>
      {sticky ? (
        <div className="sticky top-8 flex flex-col items-center pt-28 pb-6 gap-4 z-30">
          {contenido}
        </div>
      ) : (
        <div className="flex flex-col items-center pt-28 pb-6 gap-4 z-30">
          {contenido}
        </div>
      )}
    </div>
  );
};

export default RielNavegacion;
