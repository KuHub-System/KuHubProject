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
  AutocompleteItem,
  DateRangePicker,
  Tooltip
} from '@heroui/react';
import { parseDate, CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  obtenerProductoPorIdService,
  obtenerMovimientosFiltradosService,
  crearMovimientoService,
  obtenerProductosService
} from '../services/producto-service';
import { findMovimientosConFiltros } from '../services/movimiento-service';
import { IProducto } from '../types/producto.types';

/**
 * DTO para la solicitud de filtrado de movimientos (MotionFilterRequestDTO)
 */
interface IMotionFilterRequest {
  nombreProducto: string;
  nombreResponsable: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'MERMA' | 'AJUSTE' | 'DEVOLUCION' | 'TODOS';
  orden: 'MAS_RECIENTES' | 'MAS_ANTIGUOS' | 'MENOR_CANTIDAD' | 'MAYOR_CANTIDAD';
  fechaInicio: string | null;
  fechaFin: string | null;
}

/**
 * DTO para la respuesta de un movimiento (MotionAnswerDTO)
 */
interface IMotionAnswer {
  nombreProducto: string;
  nombreCategoria: string;
  tipoMovimiento: string;
  stockMovimiento: number;
  fechaMovimiento: string;
  nombreUsuario: string;
  observacion?: string;
}

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
  const queryNombre = query.get('nombre');

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Estado de datos
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [movimientos, setMovimientos] = React.useState<IMotionAnswer[]>([]);
  const [productoActual, setProductoActual] = React.useState<IProducto | null>(null);

  // Estado de filtros (Alineado con MotionFilterRequestDTO)
  const [nombreProductoFiltro, setNombreProductoFiltro] = React.useState<string>(queryNombre || 'TODOS');
  const [nombreResponsableFiltro, setNombreResponsableFiltro] = React.useState<string>('TODOS');
  const [tipoMovimientoFiltro, setTipoMovimientoFiltro] = React.useState<IMotionFilterRequest['tipoMovimiento']>('TODOS');
  const [ordenFiltro, setOrdenFiltro] = React.useState<IMotionFilterRequest['orden']>('MAS_RECIENTES');

  // Estado para el componente DateRangePicker
  const [dateRangeValue, setDateRangeValue] = React.useState<{ start: CalendarDate | null, end: CalendarDate | null }>({
    start: null,
    end: null
  });

  // Estado para el debounce (3 segundos)
  const [debouncedRequest, setDebouncedRequest] = React.useState<IMotionFilterRequest>({
    nombreProducto: queryNombre || ((id || queryProductoId) ? 'CARGANDO...' : 'TODOS'),
    nombreResponsable: 'TODOS',
    tipoMovimiento: 'TODOS',
    orden: 'MAS_RECIENTES',
    fechaInicio: null,
    fechaFin: null
  });

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

        // Si hay un ID en la URL, buscamos ese producto para el filtro inicial
        const targetId = id || queryProductoId;
        if (targetId) {
          const prod = data.find(p => p.id === targetId);
          if (prod) {
            setProductoActual(prod);
            setNombreProductoFiltro(prod.nombre);
            // Actualizar inmediatamente el debounced request para la carga inicial con producto
            setDebouncedRequest(prev => ({ ...prev, nombreProducto: prod.nombre, nombreResponsable: 'TODOS' }));
          } else {
            setDebouncedRequest(prev => ({ ...prev, nombreProducto: 'TODOS', nombreResponsable: 'TODOS' }));
          }
        } else {
          setDebouncedRequest(prev => ({ ...prev, nombreProducto: 'TODOS', nombreResponsable: 'TODOS' }));
        }
      } catch (error) {
      }
    };
    cargarProductos();
  }, [id, queryProductoId]);

  /**
   * Carga los movimientos basado en filtros
   */
  /**
   * Efecto para manejar el debounce de los filtros (3 segundos)
   */
  React.useEffect(() => {
    // Si es la carga inicial y tenemos productoId, esperamos a que cargarProductos actualice el filtro
    if (debouncedRequest.nombreProducto === 'CARGANDO...') return;

    const handler = setTimeout(() => {
      const nombreFinal = nombreProductoFiltro.trim() === '' ? 'TODOS' : nombreProductoFiltro.trim();
      const responsableFinal = nombreResponsableFiltro.trim() === '' ? 'TODOS' : nombreResponsableFiltro.trim();

      setDebouncedRequest({
        nombreProducto: nombreFinal,
        nombreResponsable: responsableFinal,
        tipoMovimiento: tipoMovimientoFiltro,
        orden: ordenFiltro,
        fechaInicio: dateRangeValue.start ? dateRangeValue.start.toString() : null,
        fechaFin: dateRangeValue.end ? dateRangeValue.end.toString() : null
      });
      setCurrentPage(1); // Resetear a la primera página al cambiar filtros
    }, 3000);

    return () => clearTimeout(handler);
  }, [nombreProductoFiltro, nombreResponsableFiltro, tipoMovimientoFiltro, ordenFiltro, dateRangeValue]);

  /**
   * Carga los movimientos basado en el request debounced
   */
  React.useEffect(() => {
    if (!debouncedRequest) return;

    const cargarMovimientos = async () => {
      try {
        setIsLoadingMovimientos(true);
        const data = await findMovimientosConFiltros(debouncedRequest);
        setMovimientos(data);
      } catch (error) {
      } finally {
        setIsLoadingMovimientos(false);
        setIsLoading(false);
      }
    };

    cargarMovimientos();
  }, [debouncedRequest]);

  /**
   * Actualiza el producto actual cuando cambia el filtro de producto
   */
  React.useEffect(() => {
    const trimmed = nombreProductoFiltro.trim();
    if (trimmed !== '' && trimmed !== 'TODOS') {
      const prod = productos.find(p => p.nombre.toLowerCase() === trimmed.toLowerCase());
      setProductoActual(prod || null);
    } else {
      setProductoActual(null);
    }
  }, [nombreProductoFiltro, productos]);

  /**
   * Vuelve a la página de inventario.
   */
  const volverAInventario = () => {
    history.push('/inventario');
  };

  const renderTipoMovimiento = (tipo: string) => {
    const tipoNormalizado = tipo.toUpperCase();
    switch (tipoNormalizado) {
      case 'ENTRADA': return <span className="text-success font-bold uppercase tracking-wide text-xs">Entrada</span>;
      case 'SALIDA': return <span className="text-warning font-bold uppercase tracking-wide text-xs">Salida</span>;
      case 'MERMA': return <span className="text-danger font-bold uppercase tracking-wide text-xs">Merma</span>;
      case 'AJUSTE': return <span className="text-warning-600 font-bold uppercase tracking-wide text-xs opacity-90">Ajuste</span>;
      case 'DEVOLUCION': return <span className="text-secondary font-bold uppercase tracking-wide text-xs">Devolución</span>;
      default: return <span className="font-bold uppercase tracking-wide text-xs">{tipo}</span>;
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Filtro Producto */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Input
                  label="Filtrar por Producto"
                  placeholder="Escriba nombre del producto..."
                  value={nombreProductoFiltro === 'TODOS' ? '' : nombreProductoFiltro}
                  onValueChange={(val) => {
                    setNombreProductoFiltro(val);
                  }}
                  maxLength={100}
                  variant="bordered"
                  startContent={<Icon icon="lucide:package" className="text-default-400" />}
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                />
              </div>

              {/* Filtro Responsable */}
              <div className="sm:col-span-2 lg:col-span-1">
                <Input
                  label="Filtrar por Responsable"
                  placeholder="Escriba nombre del responsable..."
                  value={nombreResponsableFiltro === 'TODOS' ? '' : nombreResponsableFiltro}
                  onValueChange={(val) => {
                    setNombreResponsableFiltro(val);
                  }}
                  maxLength={100}
                  variant="bordered"
                  startContent={<Icon icon="lucide:user" className="text-default-400" />}
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                />
              </div>

              {/* Filtro Tipo */}
              <Select
                label="Tipo de Movimiento"
                selectedKeys={[tipoMovimientoFiltro]}
                onChange={(e) => {
                  setTipoMovimientoFiltro(e.target.value as IMotionFilterRequest['tipoMovimiento']);
                }}
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                <SelectItem key="TODOS">Todos</SelectItem>
                <SelectItem key="ENTRADA" startContent={<Icon icon="lucide:arrow-down-circle" className="text-success" />}>Entrada</SelectItem>
                <SelectItem key="SALIDA" startContent={<Icon icon="lucide:arrow-up-circle" className="text-primary" />}>Salida</SelectItem>
                <SelectItem key="MERMA" startContent={<Icon icon="lucide:alert-circle" className="text-danger" />}>Merma</SelectItem>
                <SelectItem key="AJUSTE" startContent={<Icon icon="lucide:settings-2" className="text-warning" />}>Ajuste</SelectItem>
                <SelectItem key="DEVOLUCION" startContent={<Icon icon="lucide:rotate-ccw" className="text-secondary" />}>Devolución</SelectItem>
              </Select>

              {/* Filtro Rango de Fechas */}
              <div className="sm:col-span-2 lg:col-span-1">
                <DateRangePicker
                  label="Rango de Fechas"
                  value={dateRangeValue.start && dateRangeValue.end ? { start: dateRangeValue.start, end: dateRangeValue.end } : null}
                  onChange={(val) => {
                    if (val) {
                      setDateRangeValue({ start: val.start as CalendarDate, end: val.end as CalendarDate });
                    } else {
                      setDateRangeValue({ start: null, end: null });
                    }
                  }}
                  variant="bordered"
                  maxValue={today(getLocalTimeZone())}
                  classNames={{
                    base: "bg-white dark:bg-default-100/50",
                  }}
                />
              </div>

              {/* Filtro Orden */}
              <Select
                label="Orden"
                selectedKeys={[ordenFiltro]}
                onChange={(e) => {
                  setOrdenFiltro(e.target.value as IMotionFilterRequest['orden']);
                }}
                variant="bordered"
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                <SelectItem key="MAS_RECIENTES">Más Recientes</SelectItem>
                <SelectItem key="MAS_ANTIGUOS">Más Antiguos</SelectItem>
                <SelectItem key="MENOR_CANTIDAD">Menor Cantidad</SelectItem>
                <SelectItem key="MAYOR_CANTIDAD">Mayor Cantidad</SelectItem>
              </Select>
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
              layout="fixed"
              classNames={{
                th: "bg-default-100 dark:bg-default-50/20 text-default-500 font-bold uppercase text-xs h-12",
                td: "py-3 border-b border-default-50 dark:border-default-50/10 group-data-[last=true]:border-none"
              }}
              bottomContent={
                movimientos.length > 0 ? (
                  <div className="flex w-full justify-center py-4 border-t border-default-100">
                    <Pagination
                      total={Math.ceil(movimientos.length / rowsPerPage)}
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
                <TableColumn width="15%" align="center">PRODUCTO</TableColumn>
                <TableColumn width="10%" align="center">CATEGORÍA</TableColumn>
                <TableColumn width="10%" align="center">TIPO</TableColumn>
                <TableColumn width="5%" align="center">CANTIDAD</TableColumn>
                <TableColumn width="15%" align="center">FECHA</TableColumn>
                <TableColumn width="20%" align="center">RESPONSABLE</TableColumn>
                <TableColumn width="25%" align="center">OBSERVACIÓN</TableColumn>
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
                {movimientos
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .map((movimiento, index) => (
                    <TableRow key={`${movimiento.fechaMovimiento}-${index}`} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                      <TableCell className="max-w-[200px]">
                        <Tooltip content={movimiento.nombreProducto} delay={500} closeDelay={0}>
                          <div className="flex flex-col items-center truncate">
                            <span className="font-semibold text-secondary dark:text-foreground truncate text-center w-full">{movimiento.nombreProducto}</span>
                          </div>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" className="bg-default-100 dark:bg-default-100/50 text-default-600 dark:text-default-300">
                          {movimiento.nombreCategoria}
                        </Chip>
                      </TableCell>
                      <TableCell>{renderTipoMovimiento(movimiento.tipoMovimiento)}</TableCell>
                      <TableCell>
                        <span className="font-bold text-default-700 dark:text-default-300">
                          {movimiento.stockMovimiento}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-center">{new Date(movimiento.fechaMovimiento).toLocaleDateString('es-CL')}</span>
                          <span className="text-xs text-default-400 text-center">{new Date(movimiento.fechaMovimiento).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <Tooltip content={movimiento.nombreUsuario} delay={500} closeDelay={0}>
                          <span className="truncate block text-center w-full">{movimiento.nombreUsuario}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        {movimiento.observacion ? (
                          <Tooltip content={movimiento.observacion} delay={500} closeDelay={0}>
                            <span className="italic text-default-500 truncate block text-center w-full">{movimiento.observacion}</span>
                          </Tooltip>
                        ) : (
                          <div className="text-center text-default-300">-</div>
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
  const [tipo, setTipo] = React.useState<'Entrada' | 'Salida' | 'Merma' | 'Ajuste' | 'Devolucion'>('Entrada');
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
          <SelectItem key="Ajuste" startContent={<Icon icon="lucide:settings-2" className="text-warning" />}>Ajuste</SelectItem>
          <SelectItem key="Devolucion" startContent={<Icon icon="lucide:rotate-ccw" className="text-secondary" />}>Devolución</SelectItem>
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
