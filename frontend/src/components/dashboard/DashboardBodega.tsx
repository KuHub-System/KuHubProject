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
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <DashboardHeader
        userName={user?.nombre || 'Usuario'}
        subtitle="Panel de Gestión de Inventario"
      />

      {/* Tarjetas de Estadísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch"
      >
        <StatsCard
          title="Total Productos"
          value={totalProductos}
          icon="lucide:package"
          color="primary"
          description="Items registrados"
          onClick={() => history.push('/inventario')}
        />
        <StatsCard
          title="Con Stock"
          value={productosConStock}
          icon="lucide:check-circle"
          color="success"
          description="Disponibles para uso"
        />
        <StatsCard
          title="Sin Stock"
          value={productosSinStock}
          icon="lucide:x-circle"
          color="danger"
          description="Agotados"
        />
        <StatsCard
          title="Stock Bajo"
          value={productosBajoStock.length}
          icon="lucide:alert-triangle"
          color="warning"
          description="Requieren reposición"
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
          <Card className="shadow-sm border-t-4 border-warning bg-white dark:bg-content1">
            <CardHeader className="pb-0 pt-6 px-6 flex justify-between items-center bg-white dark:bg-content1">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-secondary">
                  <Icon icon="lucide:alert-triangle" className="text-warning" />
                  Productos con Stock Bajo
                </h3>
                <p className="text-default-500 text-sm mt-1">
                  Atención requerida: {productosBajoStock.length} producto{productosBajoStock.length !== 1 ? 's' : ''} bajo el mínimo.
                </p>
              </div>
              <Button
                size="sm"
                color="warning"
                variant="flat"
                onPress={() => history.push('/inventario')}
                endContent={<Icon icon="lucide:arrow-right" />}
                className="font-medium"
              >
                Ver Inventario Completo
              </Button>
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productosBajoStock.slice(0, 6).map((producto) => (
                  <div
                    key={producto.id}
                    className="p-4 border border-default-200 rounded-lg hover:border-warning-300 hover:shadow-md transition-all cursor-pointer bg-default-50/50 dark:bg-default-50/5 group"
                    onClick={() => history.push(`/movimientos-producto/${producto.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-secondary text-sm group-hover:text-warning-700 transition-colors">{producto.nombre}</p>
                      <Icon icon="lucide:arrow-right" className="text-default-300 group-hover:text-warning transition-colors text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-default-500">Stock actual:</span>
                        <span className="font-bold text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full">{producto.stock} {producto.unidadMedida}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-default-500">Mínimo requerido:</span>
                        <span className="font-medium text-default-700">{producto.stockMinimo} {producto.unidadMedida}</span>
                      </div>
                      {producto.categoria && (
                        <div className="pt-1 mt-1 border-t border-default-100">
                          <span className="text-[10px] uppercase font-semibold text-default-400 tracking-wider">
                            {producto.categoria}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {productosBajoStock.length > 6 && (
                <div className="mt-4 text-center">
                  <Button
                    size="sm"
                    variant="light"
                    color="warning"
                    onPress={() => history.push('/inventario')}
                  >
                    Ver {productosBajoStock.length - 6} más...
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
        <Card className="shadow-sm border-t-4 border-primary bg-white dark:bg-content1">
          <CardHeader className="pb-0 pt-6 px-6 bg-white dark:bg-content1">
            <h3 className="text-lg font-bold text-secondary">Acciones Rápidas</h3>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                color="primary"
                variant="flat"
                startContent={<Icon icon="lucide:package" width={24} />}
                onPress={() => history.push('/inventario')}
                className="h-24 justify-start px-6 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100/80 dark:hover:bg-primary-900/30 border border-primary-100 dark:border-primary-900/50"
              >
                <div className="text-left ml-2">
                  <p className="font-bold text-primary-900 text-medium">Gestionar Inventario</p>
                  <p className="text-xs text-primary-600/80 font-medium mt-1">Ver y editar productos</p>
                </div>
              </Button>
              <Button
                color="success"
                variant="flat"
                startContent={<Icon icon="lucide:plus-circle" width={24} />}
                onPress={() => history.push('/inventario')} // Assuming logic to open creation modal exists or navigates
                className="h-24 justify-start px-6 bg-success-50 dark:bg-success-900/20 hover:bg-success-100/80 dark:hover:bg-success-900/30 border border-success-100 dark:border-success-900/50"
              >
                <div className="text-left ml-2">
                  <p className="font-bold text-success-900 text-medium">Agregar Producto</p>
                  <p className="text-xs text-success-600/80 font-medium mt-1">Crear nuevo ítem</p>
                </div>
              </Button>
              <Button
                color="warning"
                variant="flat"
                startContent={<Icon icon="lucide:history" width={24} />}
                onPress={() => history.push('/movimientos-producto')}
                className="h-24 justify-start px-6 bg-warning-50 dark:bg-warning-900/20 hover:bg-warning-100/80 dark:hover:bg-warning-900/30 border border-warning-100 dark:border-warning-900/50"
              >
                <div className="text-left ml-2">
                  <p className="font-bold text-warning-900 text-medium">Ver Movimientos</p>
                  <p className="text-xs text-warning-600/80 font-medium mt-1">Historial de cambios</p>
                </div>
              </Button>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

