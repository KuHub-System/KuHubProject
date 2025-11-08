/**
 * DASHBOARD PARA BODEGA
 * Vista enfocada en inventario y productos con stock bajo
 */

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';
import { cargarDashboardBodega } from '../../services/dashboard-service';
import { DashboardHeader } from './shared/DashboardHeader';
import { StatsCard } from './shared/StatsCard';
import { IProducto } from '../../types/producto.types';
import { useAuth } from '../../contexts/auth-context';

export const DashboardBodega: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const toast = useToast();
  
  const [productos, setProductos] = useState<IProducto[]>([]);
  const [productosBajoStock, setProductosBajoStock] = useState<IProducto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const data = await cargarDashboardBodega();
      
      setProductos(data.productos);
      setProductosBajoStock(data.productosBajoStock);
      
      logger.log('✅ Datos del dashboard bodega cargados');
    } catch (error) {
      logger.error('❌ Error al cargar datos del dashboard:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular estadísticas
  const totalProductos = productos.length;
  const productosConStock = productos.filter(p => p.stock > 0).length;
  const productosSinStock = productos.filter(p => p.stock === 0).length;
  const stockTotal = productos.reduce((sum, p) => sum + p.stock, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardHeader 
        userName={user?.nombre || 'Usuario'}
        subtitle="Panel de gestión de inventario"
      />

      {/* Tarjetas de Estadísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
          <StatsCard
            title="Total Productos"
            value={totalProductos}
            icon="lucide:package"
            color="primary"
            onClick={() => history.push('/inventario')}
          />
          <StatsCard
            title="Con Stock"
            value={productosConStock}
            icon="lucide:check-circle"
            color="success"
          />
          <StatsCard
            title="Sin Stock"
            value={productosSinStock}
            icon="lucide:x-circle"
            color="danger"
          />
          <StatsCard
            title="Stock Bajo"
            value={productosBajoStock.length}
            icon="lucide:alert-triangle"
            color="warning"
            onClick={productosBajoStock.length > 0 ? () => history.push('/inventario') : undefined}
          />
      </motion.div>

      {/* Alerta de Productos con Stock Bajo */}
      {productosBajoStock.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="shadow-sm border border-warning-200">
            <CardHeader className="pb-0 pt-4 px-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-warning">
                  <Icon icon="lucide:alert-triangle" />
                  Productos con Stock Bajo
                </h3>
                <p className="text-default-500 text-sm">
                  {productosBajoStock.length} producto{productosBajoStock.length !== 1 ? 's' : ''} necesita{productosBajoStock.length === 1 ? '' : 'n'} atención
                </p>
              </div>
              <Button
                size="sm"
                color="warning"
                variant="flat"
                onPress={() => history.push('/inventario')}
                endContent={<Icon icon="lucide:arrow-right" />}
              >
                Ver Inventario
              </Button>
            </CardHeader>
            <CardBody className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {productosBajoStock.slice(0, 6).map((producto) => (
                  <div 
                    key={producto.id}
                    className="p-4 border border-warning-200 rounded-lg bg-default-50 dark:bg-default-900/10 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => history.push(`/movimientos-producto/${producto.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-sm">{producto.nombre}</p>
                      <Icon icon="lucide:arrow-right" className="text-warning text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-default-600">
                        Stock actual: <span className="font-semibold text-warning">{producto.stock}</span> {producto.unidadMedida}
                      </p>
                      <p className="text-xs text-default-500">
                        Mínimo: {producto.stockMinimo} {producto.unidadMedida}
                      </p>
                      {producto.categoria && (
                        <p className="text-xs text-default-400">
                          {producto.categoria}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {productosBajoStock.length > 6 && (
                <div className="mt-4 text-center">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => history.push('/inventario')}
                  >
                    Ver todos los productos ({productosBajoStock.length})
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Acciones Rápidas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-0 pt-4 px-4">
            <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
          </CardHeader>
          <CardBody className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                color="primary"
                variant="bordered"
                startContent={<Icon icon="lucide:package" />}
                onPress={() => history.push('/inventario')}
                className="h-20"
              >
                <div className="text-left">
                  <p className="font-semibold">Gestionar Inventario</p>
                  <p className="text-xs text-default-500">Ver y editar productos</p>
                </div>
              </Button>
              <Button
                color="success"
                variant="bordered"
                startContent={<Icon icon="lucide:plus-circle" />}
                onPress={() => history.push('/inventario')}
                className="h-20"
              >
                <div className="text-left">
                  <p className="font-semibold">Agregar Producto</p>
                  <p className="text-xs text-default-500">Crear nuevo producto</p>
                </div>
              </Button>
              <Button
                color="warning"
                variant="bordered"
                startContent={<Icon icon="lucide:trending-down" />}
                onPress={() => history.push('/movimientos-producto')}
                className="h-20"
              >
                <div className="text-left">
                  <p className="font-semibold">Ver Movimientos</p>
                  <p className="text-xs text-default-500">Historial de cambios</p>
                </div>
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

