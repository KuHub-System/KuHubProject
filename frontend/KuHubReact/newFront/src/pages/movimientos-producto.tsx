import React from 'react';
import { useParams, useHistory } from 'react-router-dom';
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
  useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { 
  obtenerProductoPorIdService, 
  obtenerMovimientosProductoService,
  crearMovimientoService
} from '../services/producto-service';
import { IProducto, IMovimientoProducto } from '../types/producto.types';

/**
 * Interfaz para los parámetros de la URL.
 */
interface MovimientosParams {
  id: string;
}

/**
 * Página de movimientos de producto.
 * Muestra el historial de movimientos (entradas, salidas, mermas) de un producto específico.
 * 
 * @returns {JSX.Element} La página de movimientos de producto.
 */
const MovimientosProductoPage: React.FC = () => {
  const { id } = useParams<MovimientosParams>();
  const history = useHistory();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  const [producto, setProducto] = React.useState<IProducto | null>(null);
  const [movimientos, setMovimientos] = React.useState<IMovimientoProducto[]>([]);
  const [totalMovimientos, setTotalMovimientos] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = React.useState<boolean>(true);
  
  const rowsPerPage = 10;

  /**
   * Carga los datos del producto al montar el componente.
   */
  React.useEffect(() => {
    const cargarProducto = async () => {
      try {
        setIsLoading(true);
        const data = await obtenerProductoPorIdService(id);
        setProducto(data);
      } catch (error) {
        console.error('Error al cargar el producto:', error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarProducto();
  }, [id]);

  /**
   * Carga los movimientos del producto cuando cambia la página.
   */
  React.useEffect(() => {
    const cargarMovimientos = async () => {
      try {
        setIsLoadingMovimientos(true);
        const { movimientos, total } = await obtenerMovimientosProductoService(id, currentPage, rowsPerPage);
        setMovimientos(movimientos);
        setTotalMovimientos(total);
      } catch (error) {
        console.error('Error al cargar los movimientos:', error);
      } finally {
        setIsLoadingMovimientos(false);
      }
    };

    cargarMovimientos();
  }, [id, currentPage]);

  /**
   * Vuelve a la página de inventario.
   */
  const volverAInventario = () => {
    history.push('/inventario');
  };

  /**
   * Renderiza un chip con el color correspondiente al tipo de movimiento.
   * 
   * @param {string} tipo - Tipo de movimiento.
   * @returns {JSX.Element} Chip con el tipo de movimiento.
   */
  const renderTipoMovimiento = (tipo: string) => {
    switch (tipo) {
      case 'Entrada':
        return <Chip color="success" size="sm">{tipo}</Chip>;
      case 'Salida':
        return <Chip color="primary" size="sm">{tipo}</Chip>;
      case 'Merma':
        return <Chip color="danger" size="sm">{tipo}</Chip>;
      default:
        return <Chip size="sm">{tipo}</Chip>;
    }
  };

  /**
   * Formatea una fecha ISO a una cadena legible.
   * 
   * @param {string} fechaISO - Fecha en formato ISO.
   * @returns {string} Fecha formateada.
   */
  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Movimientos de Producto</h1>
            <p className="text-default-500">
              Historial de entradas, salidas y mermas del producto seleccionado.
            </p>
          </div>
          <Button 
            variant="flat" 
            startContent={<Icon icon="lucide:arrow-left" />}
            onPress={volverAInventario}
          >
            Volver a Inventario
          </Button>
        </div>

        {/* Información del producto */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : producto ? (
          <Card className="shadow-sm">
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-default-500">Nombre</p>
                  <p className="font-semibold">{producto.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-default-500">Categoría</p>
                  <p className="font-semibold">{producto.categoria}</p>
                </div>
                <div>
                  <p className="text-sm text-default-500">Stock Actual</p>
                  <p className="font-semibold">{producto.stock} {producto.unidadMedida}</p>
                </div>
                <div>
                  <p className="text-sm text-default-500">Stock Mínimo</p>
                  <p className="font-semibold">{producto.stockMinimo} {producto.unidadMedida}</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  color="primary" 
                  startContent={<Icon icon="lucide:plus" />}
                  onPress={onOpen}
                >
                  Nuevo Movimiento
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="text-center py-8">
            <p>Producto no encontrado</p>
          </div>
        )}

        {/* Tabla de movimientos */}
        <Table 
          aria-label="Tabla de movimientos"
          removeWrapper
          bottomContent={
            <div className="flex w-full justify-center">
              <Pagination
                total={Math.ceil(totalMovimientos / rowsPerPage)}
                page={currentPage}
                onChange={setCurrentPage}
                showControls
              />
            </div>
          }
        >
          <TableHeader>
            <TableColumn>TIPO</TableColumn>
            <TableColumn>CANTIDAD</TableColumn>
            <TableColumn>FECHA</TableColumn>
            <TableColumn>RESPONSABLE</TableColumn>
            <TableColumn>OBSERVACIÓN</TableColumn>
          </TableHeader>
          <TableBody 
            isLoading={isLoadingMovimientos}
            loadingContent="Cargando movimientos..."
            emptyContent="No se encontraron movimientos para este producto"
          >
            {movimientos.map((movimiento) => (
              <TableRow key={movimiento.id}>
                <TableCell>{renderTipoMovimiento(movimiento.tipo)}</TableCell>
                <TableCell>{movimiento.cantidad} {producto?.unidadMedida}</TableCell>
                <TableCell>{formatearFecha(movimiento.fechaMovimiento)}</TableCell>
                <TableCell>{movimiento.responsable}</TableCell>
                <TableCell>{movimiento.observacion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      {/* Modal para nuevo movimiento */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <FormularioMovimiento 
              productoId={id} 
              onClose={onClose} 
              unidadMedida={producto?.unidadMedida || ''}
            />
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
      <ModalHeader>Nuevo Movimiento</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <Select 
            label="Tipo de Movimiento" 
            selectedKeys={[tipo]}
            onChange={(e) => setTipo(e.target.value as 'Entrada' | 'Salida' | 'Merma')}
          >
            <SelectItem key="Entrada">Entrada</SelectItem>
            <SelectItem key="Salida">Salida</SelectItem>
            <SelectItem key="Merma">Merma</SelectItem>
          </Select>
          
          <Input
            type="number"
            label="Cantidad"
            placeholder="Ingrese la cantidad"
            value={cantidad}
            onValueChange={setCantidad}
            min="1"
            endContent={<span className="text-default-400">{unidadMedida}</span>}
          />
          
          <Input
            label="Observación"
            placeholder="Ingrese una observación"
            value={observacion}
            onValueChange={setObservacion}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="flat" onPress={onClose}>
          Cancelar
        </Button>
        <Button 
          color="primary" 
          onPress={handleSubmit}
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          Guardar
        </Button>
      </ModalFooter>
    </>
  );
};

export default MovimientosProductoPage;
