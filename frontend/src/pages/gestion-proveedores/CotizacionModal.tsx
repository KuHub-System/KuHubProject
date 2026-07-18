import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  DateRangePicker,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { CalendarDate } from '@internationalized/date';
import { ICotizacionProveedor, ICotizacionResponse } from '../../types/proveedor/proveedor.types';
import { fmtN } from './constants';
import { TableSkeleton } from '../../components/SkeletonLoader';

interface CotizacionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: { start: CalendarDate; end: CalendarDate } | null;
  onDateRangeChange: (val: { start: CalendarDate; end: CalendarDate } | null) => void;
  cotizacionData: ICotizacionResponse | null;
  loading: boolean;
  error: string | null;
  onConsultar: () => void;
  onExportExcel: () => void;
}

const CotizacionModal: React.FC<CotizacionModalProps> = ({
  isOpen,
  onOpenChange,
  dateRange,
  onDateRangeChange,
  cotizacionData,
  loading,
  error,
  onConsultar,
  onExportExcel,
}) => {
  const proveedoresConId = cotizacionData?.cotizacion.filter(p => p.idProveedor !== null) ?? [];
  const proveedoresSinId = cotizacionData?.cotizacion.filter(p => p.idProveedor === null) ?? [];

  const calcularTotalProveedor = (prov: ICotizacionProveedor): number => {
    let total = 0;
    for (const cat of prov.categorias) {
      for (const prod of cat.productos) {
        if (prod.subtotal !== null) total += prod.subtotal;
      }
    }
    return total;
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside" isDismissable={false} radius="lg" classNames={{ base: 'rounded-2xl max-h-[75vh]' }}>
      <ModalContent className="rounded-2xl overflow-hidden">
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-default-200 dark:border-default-100 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Icon icon="lucide:file-spreadsheet" className="text-primary" width={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    Cotización por Rango
                  </span>
                  <span className="text-xs text-default-500">Agrupe productos por proveedor (menor precio)</span>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="gap-6 py-6 overflow-y-scroll custom-scrollbar">
              {/* Selector de rango */}
              <div className="flex flex-col sm:flex-row gap-3 items-end bg-default-50 dark:bg-default-100/20 rounded-xl p-4 border border-default-200 dark:border-default-100">
                <div className="flex-1">
                  <DateRangePicker
                    label="Seleccione rango de fechas"
                    variant="bordered"
                    value={dateRange}
                    onChange={onDateRangeChange}
                    className="w-full"
                  />
                </div>
                <Button
                  color="primary"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer min-w-fit"
                  startContent={<Icon icon="lucide:search" width={18} />}
                  isLoading={loading}
                  isDisabled={!dateRange}
                  onPress={onConsultar}
                  size="lg"
                >
                  Consultar
                </Button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-danger-50 dark:bg-danger-50/10 border border-danger/30 text-danger text-sm p-4 rounded-xl">
                  <Icon icon="lucide:alert-circle" width={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Error en la consulta</p>
                    <p className="text-xs text-danger/80 dark:text-danger/70 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && <TableSkeleton rows={6} columns={5} />}

              {/* Resultados */}
              {!loading && cotizacionData && (
                <div className="space-y-4">
                  {cotizacionData.cotizacion.length === 0 ? (
                    <div className="text-center py-10 text-default-400">
                      <Icon icon="lucide:inbox" width={40} className="mx-auto mb-2" />
                      <p>No hay productos solicitados en el rango seleccionado.</p>
                    </div>
                  ) : (
                    <>
                      {/* Proveedores con datos */}
                      {proveedoresConId.map((prov) => {
                        const totalProv = calcularTotalProveedor(prov);
                        return (
                          <Card
                            key={prov.idProveedor}
                            className="shadow-sm border border-default-200 dark:border-default-100"
                          >
                            <CardBody className="p-0">
                              {/* Header proveedor */}
                              <div className="bg-primary-50 dark:bg-primary-50/10 px-4 py-3 border-b border-default-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-base text-secondary dark:text-foreground">
                                      {prov.nombreDistribuidora}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Icon icon="lucide:user" width={12} />
                                        {prov.nombreProveedor ?? '—'}
                                      </span>
                                      {prov.telefono && (
                                        <>
                                          <span className="text-default-300">•</span>
                                          <span className="flex items-center gap-1">
                                            <Icon icon="lucide:phone" width={12} />
                                            {prov.telefono}
                                          </span>
                                        </>
                                      )}
                                      {prov.email && (
                                        <>
                                          <span className="text-default-300">•</span>
                                          <span className="flex items-center gap-1">
                                            <Icon icon="lucide:mail" width={12} />
                                            {prov.email}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Chip color="primary" size="sm" variant="flat">
                                      {prov.totalProductos} producto{prov.totalProductos !== 1 ? 's' : ''}
                                    </Chip>
                                    <Chip color="success" size="sm" variant="flat" className="font-bold">
                                      Total: ${fmtN(totalProv)}
                                    </Chip>
                                  </div>
                                </div>
                              </div>

                              {/* Tabla de productos */}
                              <div className="px-4 py-3">
                                {prov.categorias.map((cat) => (
                                  <div key={cat.idCategoria} className="mb-3 last:mb-0">
                                    <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
                                      {cat.nombreCategoria}
                                    </p>
                                    <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                                      <table className="w-full text-xs table-fixed">
                                        <colgroup>
                                          <col style={{ width: '40%' }} />
                                          <col style={{ width: '12%' }} />
                                          <col style={{ width: '15%' }} />
                                          <col style={{ width: '15%' }} />
                                          <col style={{ width: '18%' }} />
                                        </colgroup>
                                        <thead className="bg-default-100 dark:bg-default-50">
                                          <tr>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Producto</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Unidad</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Cantidad</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Precio Unit.</th>
                                            <th className="text-center py-2 px-3 font-medium overflow-hidden">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cat.productos.map((prod) => (
                                            <tr
                                              key={prod.idProducto}
                                              className="border-t border-default-100 dark:border-default-50 hover:bg-default-50 dark:hover:bg-default-100/20"
                                            >
                                              <td className="py-2 px-3 font-medium text-center overflow-hidden">
                                                <Tooltip content={prod.nombreProducto} color="default">
                                                  <span className="truncate">{prod.nombreProducto}</span>
                                                </Tooltip>
                                              </td>
                                              <td className="py-2 px-3 text-center text-default-500 overflow-hidden">
                                                <Tooltip content={prod.abreviatura} color="default">
                                                  <span className="truncate">{prod.abreviatura}</span>
                                                </Tooltip>
                                              </td>
                                              <td className="py-2 px-3 text-center overflow-hidden">{fmtN(prod.cantidadTotal)}</td>
                                              <td className="py-2 px-3 text-center overflow-hidden">
                                                {prod.precioUnitario !== null ? `$${fmtN(prod.precioUnitario)}` : '—'}
                                              </td>
                                              <td className="py-2 px-3 text-center font-semibold overflow-hidden">
                                                {prod.subtotal !== null ? `$${fmtN(prod.subtotal)}` : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>
                        );
                      })}

                      {/* Productos sin proveedor */}
                      {proveedoresSinId.length > 0 && proveedoresSinId.map((sinProv, idx) => (
                        <Card
                          key={`sin-prov-${idx}`}
                          className="shadow-sm border-2 border-danger-200 dark:border-danger-300"
                        >
                          <CardBody className="p-0">
                            <div className="bg-danger-50 dark:bg-danger-50/10 px-4 py-3 border-b border-danger-200">
                              <div className="flex items-center gap-2">
                                <Icon icon="lucide:alert-triangle" className="text-danger" width={20} />
                                <h4 className="font-bold text-base text-danger">
                                  Productos Sin Proveedor
                                </h4>
                                <Chip color="danger" size="sm" variant="flat">
                                  {sinProv.totalProductos} producto{sinProv.totalProductos !== 1 ? 's' : ''}
                                </Chip>
                              </div>
                              <p className="text-xs text-danger-400 mt-1">
                                Estos productos no tienen un proveedor asignado. No hay precio asociado.
                              </p>
                            </div>

                            <div className="px-4 py-3">
                              {sinProv.categorias.map((cat) => (
                                <div key={cat.idCategoria} className="mb-3 last:mb-0">
                                  <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
                                    {cat.nombreCategoria}
                                  </p>
                                  <div className="overflow-x-auto rounded-lg border border-danger-100 dark:border-danger-200">
                                    <table className="w-full text-xs table-fixed">
                                      <colgroup>
                                        <col style={{ width: '40%' }} />
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '18%' }} />
                                      </colgroup>
                                      <thead className="bg-danger-50/50 dark:bg-danger-50/10">
                                        <tr>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Producto</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Unidad</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Cantidad</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Precio Unit.</th>
                                          <th className="text-center py-2 px-3 font-medium text-danger-600 overflow-hidden">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cat.productos.map((prod) => (
                                          <tr
                                            key={prod.idProducto}
                                            className="border-t border-danger-50 dark:border-danger-100 hover:bg-danger-50/30"
                                          >
                                            <td className="py-2 px-3 font-medium text-center overflow-hidden">
                                              <Tooltip content={prod.nombreProducto} color="default">
                                                <span className="truncate">{prod.nombreProducto}</span>
                                              </Tooltip>
                                            </td>
                                            <td className="py-2 px-3 text-center text-default-500 overflow-hidden">{prod.abreviatura}</td>
                                            <td className="py-2 px-3 text-center overflow-hidden">{fmtN(prod.cantidadTotal)}</td>
                                            <td className="py-2 px-3 text-center text-default-400 overflow-hidden">—</td>
                                            <td className="py-2 px-3 text-center text-default-400 overflow-hidden">—</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
              <Button variant="ghost" onPress={onClose} className="font-medium">
                Cerrar
              </Button>
              {cotizacionData && cotizacionData.cotizacion.length > 0 && (
                <Button
                  color="success"
                  variant="solid"
                  className="font-bold text-secondary shadow-md cursor-pointer"
                  startContent={<Icon icon="lucide:download" width={18} />}
                  onPress={onExportExcel}
                  size="lg"
                >
                  Descargar Excel
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CotizacionModal;
