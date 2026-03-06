import React from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Pagination,
  Chip,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  Autocomplete,
  AutocompleteItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  obtenerProductoPorIdService,
  obtenerMovimientosFiltradosService,
  crearMovimientoService,
  obtenerProductosService
} from '../services/producto-service';
import { IProducto, IMovimientoProducto } from '../types/producto.types';

/**
 * Interfaz para los parámetros de la URL.
 */
interface MovimientosParams {
  id?: string;
}

/**
 * Hook personalizado para obtener query params
 */
function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

/**
 * Página de movimientos de producto.
 * Muestra el historial de movimientos con filtros avanzados.
 */
const MovimientosProductoPage: React.FC = () => {
  const { id } = useParams<MovimientosParams>();
  const history = useHistory();
  const query = useQuery();
  const queryProductoId = query.get('productoId');

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Estado de datos
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [movimientos, setMovimientos] = React.useState<IMovimientoProducto[]>([]);
  const [totalMovimientos, setTotalMovimientos] = React.useState<number>(0);
  const [productoActual, setProductoActual] = React.useState<IProducto | null>(null);

  // Estado de filtros
  const [filtroProducto, setFiltroProducto] = React.useState<string | null>(id || queryProductoId || 'todos');
  const [filtroTipo, setFiltroTipo] = React.useState<string>('todos');
  const [filtroOrden, setFiltroOrden] = React.useState<'reciente' | 'antiguo' | 'cantidad_asc' | 'cantidad_desc'>('reciente');
  const [filtroFecha, setFiltroFecha] = React.useState<string>('');

  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = React.useState<boolean>(true);

  const rowsPerPage = 10;

  /**
   * Carga la lista de productos para el filtro
   */
  React.useEffect(() => {
    const cargarProductos = async () => {
      try {
        const data = await obtenerProductosService();
        setProductos(data);

        // Si hay un ID en la URL, buscamos ese producto para mostrar su info
        const targetId = id || queryProductoId;
        if (targetId) {
          const prod = data.find(p => p.id === targetId);
          if (prod) setProductoActual(prod);
          setFiltroProducto(targetId);
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    cargarProductos();
  }, [id, queryProductoId]);

  /**
   * Carga los movimientos basado en filtros
   */
  React.useEffect(() => {
    const cargarMovimientos = async () => {
      try {
        setIsLoadingMovimientos(true);

        const { movimientos, total } = await obtenerMovimientosFiltradosService(
          {
            productoId: filtroProducto === 'todos' ? undefined : filtroProducto || undefined,
            tipo: filtroTipo === 'todos' ? undefined : filtroTipo as any,
            orden: filtroOrden,
            fechaInicio: filtroFecha || undefined,
            fechaFin: filtroFecha || undefined
          },
          currentPage,
          rowsPerPage
        );

        setMovimientos(movimientos);
        setTotalMovimientos(total);
      } catch (error) {
        console.error('Error al cargar movimientos:', error);
      } finally {
        setIsLoadingMovimientos(false);
        setIsLoading(false);
      }
    };

    cargarMovimientos();
  }, [filtroProducto, filtroTipo, filtroOrden, filtroFecha, currentPage]);

  /**
   * Actualiza el producto actual cuando cambia el filtro de producto
   */
  React.useEffect(() => {
    if (filtroProducto && filtroProducto !== 'todos') {
      const prod = productos.find(p => p.id === filtroProducto);
      setProductoActual(prod || null);
    } else {
      setProductoActual(null);
    }
  }, [filtroProducto, productos]);

  /**
   * Vuelve a la página de inventario.
   */
  const volverAInventario = () => {
    history.push('/inventario');
  };

  const renderTipoMovimiento = (tipo: string) => {
    switch (tipo) {
      case 'Entrada': return <Chip color="success" size="sm" variant="flat">Entrada</Chip>;
      case 'Salida': return <Chip color="primary" size="sm" variant="flat">Salida</Chip>;
      case 'Merma': return <Chip color="danger" size="sm" variant="flat">Merma</Chip>;
      default: return <Chip size="sm">{tipo}</Chip>;
    }
  };

  const formatearFecha = (fechaISO: string) => {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Encabezado y Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary dark:text-foreground mb-2">Movimientos de Inventario</h1>
            <p className="text-default-500 text-lg">Gestione y visualice el historial de movimientos.</p>
          </div>
          <Button
            color="primary"
            variant="ghost"
            startContent={<Icon icon="lucide:arrow-left" width={20} />}
            onPress={volverAInventario}
            className="font-medium text-secondary dark:text-foreground"
          >
            Volver al Inventario
          </Button>
        </div>

        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-6 space-y-6">
            <h3 className="text-lg font-bold text-secondary dark:text-foreground flex items-center gap-2">
              <Icon icon="lucide:filter" width={20} />
              Filtros de Búsqueda
            </h3>

            {/* Fila de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {/* Filtro Producto */}
              <div className="sm:col-span-2">
                <Autocomplete
                  label="Filtrar por Producto"
                  placeholder="Todos los productos"
                  selectedKey={filtroProducto}
                  onSelectionChange={(key) => {
                    setFiltroProducto(key as string);
                    setCurrentPage(1);
                  }}
                  defaultItems={productos}
                  variant="bordered"
                  startContent={<Icon icon="lucide:package" className="text-default-400" />}
                >
                  {(item) => <AutocompleteItem key={item.id}>{item.nombre}</AutocompleteItem>}
                </Autocomplete>
              </div>

              {/* Filtro Tipo */}
              <Select
                label="Tipo de Movimiento"
                selectedKeys={[filtroTipo]}
                onChange={(e) => {
                  setFiltroTipo(e.target.value);
                  setCurrentPage(1);
                }}
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                <SelectItem key="todos">Todos</SelectItem>
                <SelectItem key="Entrada" startContent={<Icon icon="lucide:arrow-down-circle" className="text-success" />}>Entrada</SelectItem>
                <SelectItem key="Salida" startContent={<Icon icon="lucide:arrow-up-circle" className="text-primary" />}>Salida</SelectItem>
                <SelectItem key="Merma" startContent={<Icon icon="lucide:alert-circle" className="text-danger" />}>Merma</SelectItem>
              </Select>

              {/* Filtro Orden */}
              <Select
                label="Orden"
                selectedKeys={[filtroOrden]}
                onChange={(e) => {
                  setFiltroOrden(e.target.value as any);
                  setCurrentPage(1);
                }}
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                <SelectItem key="reciente">Más Recientes</SelectItem>
                <SelectItem key="antiguo">Más Antiguos</SelectItem>
                <SelectItem key="cantidad_asc">Menor Cantidad</SelectItem>
                <SelectItem key="cantidad_desc">Mayor Cantidad</SelectItem>
              </Select>

              {/* Filtro Fecha */}
              <Input
                type="date"
                label="Fecha Específica"
                placeholder="Seleccione fecha"
                value={filtroFecha}
                max={new Date().toISOString().split('T')[0]} // Restringir a fecha actual o anterior
                onValueChange={(val) => {
                  setFiltroFecha(val);
                  setCurrentPage(1);
                }}
                variant="bordered"
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
              />
            </div>
          </CardBody>
        </Card>

        {/* Resumen del Producto (Solo si hay uno seleccionado) */}
        {productoActual && (
          <Card className="shadow-md bg-white dark:bg-content1 border-l-4 border-primary">
            <CardBody className="p-6 flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary-100 rounded-full text-primary-700">
                  <Icon icon="lucide:box" width={32} height={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary dark:text-foreground">{productoActual.nombre}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-default-500">Stock Actual:</p>
                    <Chip size="md" variant="flat" color="primary" className="font-bold">
                      {productoActual.stock} {productoActual.unidadMedida}
                    </Chip>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                color="primary"
                variant="solid"
                className="font-bold text-secondary dark:text-primary-foreground shadow-lg"
                startContent={<Icon icon="lucide:plus-circle" width={20} />}
                onPress={() => {
                  onOpen();
                }}
              >
                Nuevo Movimiento
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Tabla de movimientos */}
        <Card className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de movimientos"
              removeWrapper
              classNames={{
                th: "bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-12",
                td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none"
              }}
              bottomContent={
                totalMovimientos > 0 ? (
                  <div className="flex w-full justify-center py-4 border-t border-default-100">
                    <Pagination
                      total={Math.ceil(totalMovimientos / rowsPerPage)}
                      page={currentPage}
                      onChange={setCurrentPage}
                      showControls
                      color="primary"
                    />
                  </div>
                ) : null
              }
            >
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn>CATEGORÍA</TableColumn>
                <TableColumn>TIPO</TableColumn>
                <TableColumn>CANTIDAD</TableColumn>
                <TableColumn>FECHA</TableColumn>
                <TableColumn>RESPONSABLE</TableColumn>
                <TableColumn>OBSERVACIÓN</TableColumn>
              </TableHeader>
              <TableBody
                isLoading={isLoadingMovimientos}
                loadingContent={<div className="py-8 text-center">Cargando movimientos...</div>}
                emptyContent={
                  <div className="py-12 text-center text-default-400">
                    <Icon icon="lucide:clipboard-list" className="mx-auto mb-3 opacity-50" width={48} />
                    <p className="text-lg font-medium">No se encontraron movimientos</p>
                    <p className="text-sm">Intenta ajustar los filtros.</p>
                  </div>
                }
              >
                {movimientos.map((movimiento) => (
                  <TableRow key={movimiento.id} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-secondary dark:text-foreground">{movimiento.productoNombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                        {productos.find(p => p.id === movimiento.productoId)?.categoria || '-'}
                      </Chip>
                    </TableCell>
                    <TableCell>{renderTipoMovimiento(movimiento.tipo)}</TableCell>
                    <TableCell>
                      <span className="font-bold text-default-700 dark:text-default-300">
                        {movimiento.cantidad} {
                          productos.find(p => p.id === movimiento.productoId)?.unidadMedida || ''
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{new Date(movimiento.fechaMovimiento).toLocaleDateString('es-CL')}</span>
                        <span className="text-xs text-default-400">{new Date(movimiento.fechaMovimiento).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </TableCell>
                    <TableCell>{movimiento.responsable}</TableCell>
                    <TableCell>
                      {movimiento.observacion ? (
                        <span className="italic text-default-500">{movimiento.observacion}</span>
                      ) : (
                        <span className="text-default-300">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      {/* Modal para nuevo movimiento */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-secondary-50 dark:bg-secondary-50/10">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:arrow-left-right" className="text-secondary" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">Registrar Movimiento</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <FormularioMovimiento
                  productoId={productoActual?.id || ''}
                  onClose={() => {
                    onClose();
                    // Necesitamos refrescar los movimientos y el producto
                    window.location.reload();
                  }}
                  unidadMedida={productoActual?.unidadMedida || ''}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

/**
 * Interfaz para las propiedades del componente FormularioMovimiento.
 */
interface FormularioMovimientoProps {
  productoId: string;
  onClose: () => void;
  unidadMedida: string;
}

/**
 * Componente de formulario para crear un nuevo movimiento.
 * 
 * @param {FormularioMovimientoProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de movimiento.
 */
const FormularioMovimiento: React.FC<FormularioMovimientoProps> = ({ productoId, onClose, unidadMedida }) => {
  const [tipo, setTipo] = React.useState<'Entrada' | 'Salida' | 'Merma'>('Entrada');
  const [cantidad, setCantidad] = React.useState<string>('');
  const [observacion, setObservacion] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  /**
   * Maneja el envío del formulario.
   */
  const handleSubmit = async () => {
    if (!cantidad || parseInt(cantidad) <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      setIsLoading(true);
      await crearMovimientoService({
        productoId,
        tipo,
        cantidad: parseInt(cantidad),
        observacion
      });
      onClose();
      // En una implementación real, aquí se actualizaría la lista de movimientos
    } catch (error) {
      console.error('Error al crear el movimiento:', error);
      alert('Error al crear el movimiento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4 bg-default-50 dark:bg-content2 p-4 rounded-lg border border-default-200 dark:border-default-100">
        <Select
          label="Tipo de Movimiento"
          selectedKeys={[tipo]}
          onChange={(e) => setTipo(e.target.value as 'Entrada' | 'Salida' | 'Merma')}
          variant="bordered"
          classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
          disallowEmptySelection
        >
          <SelectItem key="Entrada" startContent={<Icon icon="lucide:arrow-down-circle" className="text-success" />}>Entrada</SelectItem>
          <SelectItem key="Salida" startContent={<Icon icon="lucide:arrow-up-circle" className="text-primary" />}>Salida</SelectItem>
          <SelectItem key="Merma" startContent={<Icon icon="lucide:alert-circle" className="text-danger" />}>Merma</SelectItem>
        </Select>

        <Input
          type="number"
          label="Cantidad"
          placeholder="Ingrese la cantidad"
          value={cantidad}
          onValueChange={setCantidad}
          min="1"
          variant="bordered"
          classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
          endContent={<span className="text-default-400">{unidadMedida}</span>}
        />

        <Input
          label="Observación"
          placeholder="Ingrese una observación (opcional)"
          value={observacion}
          onValueChange={setObservacion}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
        />
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="primary"
          variant="solid"
          onPress={handleSubmit}
          isLoading={isLoading}
          isDisabled={isLoading}
          className="font-bold text-secondary dark:text-primary-foreground shadow-md"
          startContent={<Icon icon="lucide:save" />}
        >
          Guardar Movimiento
        </Button>
      </div>
    </>
  );
};

export default MovimientosProductoPage;
