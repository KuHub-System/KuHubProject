import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Input,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Autocomplete,
  AutocompleteItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IProducto } from '../types/producto.types';
import { 
  obtenerProductosService, 
  crearProductoService, 
  actualizarProductoService,
  eliminarProductoService,
} from '../services/producto-service';
import { useToast, useConfirm } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/auth-context';

/**
 * Interfaz para un item del pedido masivo
 */
interface ItemPedidoMasivo {
  id: string;
  producto: IProducto;
  cantidad: number;
  notas?: string;
}

/**
 * Página de inventario.
 * Muestra una tabla con los productos del inventario y permite realizar operaciones CRUD.
 * 
 * @returns {JSX.Element} La página de inventario.
 */
const InventarioPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const esAdministrador = user?.rol === 'Administrador';
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [filteredProductos, setFilteredProductos] = React.useState<IProducto[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [selectedCategoria, setSelectedCategoria] = React.useState<string>('todas');
  const rowsPerPage = 10;
  
  const history = useHistory();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isPedidoMasivoOpen, onOpen: onPedidoMasivoOpen, onOpenChange: onPedidoMasivoOpenChange } = useDisclosure();
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<IProducto | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar'>('crear');

  /**
   * Carga los productos al montar el componente.
   */
  const cargarProductos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Cargar productos desde el servicio (que usa storage-service internamente)
      const data = await obtenerProductosService();
      setProductos(data);
      setFilteredProductos(data);
    } catch (error) {
      logger.error('Error al cargar productos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargarProductos();

    // Verificar si hay un filtro pendiente desde el dashboard
    const filtroGuardado = sessionStorage.getItem('inventarioFiltro');
    if (filtroGuardado === 'stockBajo') {
      // Aplicar filtro de stock bajo
      setSelectedCategoria('stock-bajo');
      sessionStorage.removeItem('inventarioFiltro');
    }

    // Escuchar evento personalizado para recargar productos cuando se actualizan
    const handleProductosActualizados = () => {
      cargarProductos();
    };

    window.addEventListener('productosActualizados', handleProductosActualizados);

    return () => {
      window.removeEventListener('productosActualizados', handleProductosActualizados);
    };
  }, [cargarProductos]);

  /**
   * Filtra los productos según el término de búsqueda y la categoría seleccionada.
   */
  React.useEffect(() => {
    let filtered = [...productos];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(producto => 
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por categoría o stock bajo
    if (selectedCategoria !== 'todas') {
      if (selectedCategoria === 'stock-bajo') {
        // Filtro especial para productos con stock bajo
        filtered = filtered.filter(producto => 
          producto.stock <= producto.stockMinimo
        );
      } else {
        // Filtro normal por categoría
        filtered = filtered.filter(producto => 
          producto.categoria === selectedCategoria
        );
      }
    }
    
    setFilteredProductos(filtered);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  }, [searchTerm, selectedCategoria, productos]);

  /**
   * Obtiene las categorías únicas de los productos, agregando la opción de Stock Bajo.
   */
  const categorias = React.useMemo(() => {
    const categoriasSet = new Set(productos.map(producto => producto.categoria));
    return ['todas', 'stock-bajo', ...Array.from(categoriasSet)];
  }, [productos]);

  /**
   * Calcula los productos a mostrar en la página actual.
   */
  const paginatedProductos = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredProductos.slice(start, end);
  }, [currentPage, filteredProductos, rowsPerPage]);

  /**
   * Navega a la página de movimientos del producto.
   * 
   * @param {string} id - ID del producto.
   */
  const verMovimientos = (id: string) => {
    history.push(`/movimientos-producto/${id}`);
  };

  /**
   * Abre el modal para crear un nuevo producto.
   */
  const handleNuevoProducto = () => {
    setModalMode('crear');
    setProductoSeleccionado(null);
    onOpen();
  };

  const handleEliminarProducto = async (producto: IProducto) => {
    if (!esAdministrador) {
      toast.warning('Solo el rol Administrador puede eliminar productos.');
      return;
    }

    const confirmado = await confirm(
      `Eliminarás definitivamente el producto "${producto.nombre}".`,
      {
        title: 'Eliminar producto',
        confirmText: 'Eliminar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextHelper: 'Esta acción elimina el producto y sus datos asociados.',
      }
    );

    if (!confirmado) return;

    try {
      await eliminarProductoService(producto.id);
      toast.success('Producto eliminado correctamente');
      window.dispatchEvent(new Event('productosActualizados'));
    } catch (error: any) {
      logger.error('Error al eliminar producto:', error);
      toast.error(error.message || 'Error al eliminar el producto');
    }
  };

  /**
   * Abre el modal para editar un producto existente.
   * 
   * @param {IProducto} producto - Producto a editar.
   */
  const handleEditarProducto = (producto: IProducto) => {
    setModalMode('editar');
    setProductoSeleccionado(producto);
    onOpen();
  };

  /**
   * Renderiza el estado del stock con un chip de color según el nivel.
   * 
   * @param {IProducto} producto - Producto a evaluar.
   * @returns {JSX.Element} Chip con el estado del stock.
   */
  const renderStockStatus = (producto: IProducto) => {
    if (producto.stock <= 0) {
      return <Chip color="danger" size="sm">Sin stock</Chip>;
    } else if (producto.stock < producto.stockMinimo) {
      return <Chip color="warning" size="sm">Stock bajo</Chip>;
    } else {
      return <Chip color="success" size="sm">Disponible</Chip>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Inventario</h1>
          <p className="text-default-500">
            Gestione los productos del inventario, vea movimientos y actualice existencias.
          </p>
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              startContent={<Icon icon="lucide:search" className="text-default-400" />}
              className="w-full sm:w-64"
            />
            
            <Dropdown>
              <DropdownTrigger>
                <Button 
                  variant="flat" 
                  startContent={<Icon icon="lucide:filter" />}
                >
                  {selectedCategoria === 'todas' 
                    ? 'Todas las categorías' 
                    : selectedCategoria === 'stock-bajo'
                    ? '⚠️ Stock Bajo'
                    : selectedCategoria}
                </Button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="Categorías"
                onAction={(key) => setSelectedCategoria(key as string)}
              >
                {categorias.map((categoria) => (
                  <DropdownItem key={categoria}>
                    {categoria === 'todas' 
                      ? 'Todas las categorías' 
                      : categoria === 'stock-bajo'
                      ? '⚠️ Stock Bajo'
                      : categoria}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
          
          <div className="flex gap-2">
            <Button 
              color="secondary" 
              variant="flat"
              startContent={<Icon icon="lucide:shopping-cart" />}
              onPress={onPedidoMasivoOpen}
            >
              Realizar Pedido
            </Button>
            <Button 
              color="primary" 
              startContent={<Icon icon="lucide:plus" />}
              onPress={handleNuevoProducto}
            >
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Tabla de productos */}
        <Table 
          aria-label="Tabla de productos"
          removeWrapper
          bottomContent={
            <div className="flex w-full justify-center">
              <Pagination
                total={Math.ceil(filteredProductos.length / rowsPerPage)}
                page={currentPage}
                onChange={setCurrentPage}
                showControls
              />
            </div>
          }
        >
          <TableHeader>
            <TableColumn>NOMBRE</TableColumn>
            <TableColumn>CATEGORÍA</TableColumn>
            <TableColumn>STOCK</TableColumn>
            <TableColumn>UNIDAD</TableColumn>
            <TableColumn>ESTADO</TableColumn>
            <TableColumn>ACCIONES</TableColumn>
          </TableHeader>
          <TableBody 
            isLoading={isLoading}
            loadingContent="Cargando productos..."
            emptyContent="No se encontraron productos"
          >
            {paginatedProductos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell>{producto.nombre}</TableCell>
                <TableCell>{producto.categoria}</TableCell>
                <TableCell>{producto.stock}</TableCell>
                <TableCell>{producto.unidadMedida}</TableCell>
                <TableCell>{renderStockStatus(producto)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      isIconOnly 
                      variant="light" 
                      size="sm"
                      onPress={() => handleEditarProducto(producto)}
                    >
                      <Icon icon="lucide:edit" className="text-primary" />
                    </Button>
                    <Button 
                      isIconOnly 
                      variant="light" 
                      size="sm"
                      onPress={() => verMovimientos(producto.id)}
                    >
                      <Icon icon="lucide:list" className="text-default-600" />
                    </Button>
                    {esAdministrador && (
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => handleEliminarProducto(producto)}
                      >
                        <Icon icon="lucide:trash" className="text-danger" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      {/* Modal para crear/editar producto */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {modalMode === 'crear' ? 'Nuevo Producto' : 'Editar Producto'}
              </ModalHeader>
              <ModalBody>
                <FormularioProducto 
                  producto={productoSeleccionado} 
                  onClose={onClose}
                  mode={modalMode}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal para pedido masivo */}
      <Modal isOpen={isPedidoMasivoOpen} onOpenChange={onPedidoMasivoOpenChange} size="4xl">
        <ModalContent>
          {(onClose) => (
            <PedidoMasivoModal 
              productos={productos}
              onClose={onClose}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

/**
 * Interfaz para las propiedades del componente FormularioProducto.
 */
interface FormularioProductoProps {
  producto: IProducto | null;
  onClose: () => void;
  mode: 'crear' | 'editar';
}

/**
 * Componente de formulario para crear o editar un producto.
 * 
 * @param {FormularioProductoProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de producto.
 */
const FormularioProducto: React.FC<FormularioProductoProps> = ({ producto, onClose, mode }) => {
  const toast = useToast();
  const [nombre, setNombre] = React.useState(producto?.nombre || '');
  const [descripcion, setDescripcion] = React.useState(producto?.descripcion || '');
  const [categoria, setCategoria] = React.useState(producto?.categoria || '');
  const [unidadMedida, setUnidadMedida] = React.useState(producto?.unidadMedida || '');
  const [stock, setStock] = React.useState(producto?.stock?.toString() || '0');
  const [stockMinimo, setStockMinimo] = React.useState(producto?.stockMinimo?.toString() || '0');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    // Validaciones
    if (!nombre.trim()) {
      toast.warning('El nombre del producto es requerido');
      return;
    }
    if (!categoria.trim()) {
      toast.warning('La categoría es requerida');
      return;
    }
    if (!unidadMedida.trim()) {
      toast.warning('La unidad de medida es requerida');
      return;
    }

    try {
      setIsLoading(true);
      
      if (mode === 'crear') {
        // Crear nuevo producto usando el servicio
        const datosProducto = {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria: categoria.trim(),
          unidadMedida: unidadMedida.trim(),
          stock: parseFloat(stock) || 0,
          stockMinimo: parseFloat(stockMinimo) || 0,
        };
        
        await crearProductoService(datosProducto);
        toast.success('Producto creado exitosamente');
      } else {
        // Actualizar producto existente usando el servicio
        if (!producto?.id) {
          throw new Error('ID de producto no encontrado');
        }
        
        const datosActualizacion = {
          id: producto.id,
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria: categoria.trim(),
          unidadMedida: unidadMedida.trim(),
          stock: parseFloat(stock) || 0,
          stockMinimo: parseFloat(stockMinimo) || 0,
        };
        
        await actualizarProductoService(datosActualizacion);
        toast.success('Producto actualizado exitosamente');
      }

      // Despachar evento personalizado para notificar el cambio
      window.dispatchEvent(new Event('productosActualizados'));
      
      onClose();
    } catch (error) {
      logger.error('Error al guardar producto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Nombre"
        placeholder="Nombre del producto"
        value={nombre}
        onValueChange={setNombre}
        isRequired
      />
      
      <Input
        label="Descripción"
        placeholder="Descripción del producto"
        value={descripcion}
        onValueChange={setDescripcion}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Categoría <span className="text-danger">*</span>
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 border-default-200 hover:border-default-400 focus:border-primary focus:outline-none transition-colors bg-default-100"
            required
          >
            <option value="">Seleccione una categoría</option>
            <option value="Abarrotes">Abarrotes</option>
            <option value="Aseo y Descartables">Aseo y Descartables</option>
            <option value="Carnes">Carnes</option>
            <option value="Frutas y Verduras Congeladas">Frutas y Verduras Congeladas</option>
            <option value="Pescado y Mariscos">Pescado y Mariscos</option>
            <option value="Utensilios">Utensilios</option>
            <option value="Vinos y Destilados">Vinos y Destilados</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Unidad de Medida <span className="text-danger">*</span>
          </label>
          <select
            value={unidadMedida}
            onChange={(e) => setUnidadMedida(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 border-default-200 hover:border-default-400 focus:border-primary focus:outline-none transition-colors bg-default-100"
            required
          >
            <option value="">Seleccione una unidad</option>
            <option value="kg">Kilo (kg)</option>
            <option value="l">Litro (l)</option>
            <option value="unidad">Unidad</option>
            <option value="manga">Manga</option>
            <option value="botella">Botella</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          label="Stock"
          placeholder="Stock actual"
          value={stock}
          onValueChange={setStock}
          min="0"
          step="0.01"
        />
        
        <Input
          type="number"
          label="Stock Mínimo"
          placeholder="Stock mínimo"
          value={stockMinimo}
          onValueChange={setStockMinimo}
          min="0"
          step="0.01"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
          Cancelar
        </Button>
        <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
          {mode === 'crear' ? 'Crear Producto' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
};

/**
 * Interfaz para las propiedades del modal de pedido masivo
 */
interface PedidoMasivoModalProps {
  productos: IProducto[];
  onClose: () => void;
}

/**
 * Modal para realizar pedidos masivos hacia bodega de tránsito
 */
const PedidoMasivoModal: React.FC<PedidoMasivoModalProps> = ({ productos, onClose }) => {
  const toast = useToast();
  const [itemsPedido, setItemsPedido] = React.useState<ItemPedidoMasivo[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = React.useState<string>('');
  const [cantidad, setCantidad] = React.useState<string>('');
  const [notas, setNotas] = React.useState<string>('');

  const agregarProducto = () => {
    const producto = productos.find(p => p.id === productoSeleccionado);
    if (producto && cantidad && parseFloat(cantidad) > 0) {
      const nuevoItem: ItemPedidoMasivo = {
        id: Date.now().toString(),
        producto,
        cantidad: parseFloat(cantidad),
        notas: notas.trim() || undefined
      };
      
      setItemsPedido([...itemsPedido, nuevoItem]);
      setProductoSeleccionado('');
      setCantidad('');
      setNotas('');
    }
  };

  const eliminarItem = (id: string) => {
    setItemsPedido(itemsPedido.filter(item => item.id !== id));
  };

  const procesarPedido = async () => {
    try {
      // Aquí iría la lógica para procesar el pedido masivo
      logger.log('Procesando pedido masivo:', itemsPedido);
      
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Pedido procesado exitosamente. ${itemsPedido.length} productos enviados a bodega de tránsito.`);
      onClose();
    } catch (error) {
      logger.error('Error al procesar pedido:', error);
      toast.error('Error al procesar el pedido');
    }
  };

  const productoSeleccionadoObj = productos.find(p => p.id === productoSeleccionado);

  return (
    <>
      <ModalHeader className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Realizar Pedido Masivo</h2>
        <p className="text-sm text-default-500">Envíe múltiples productos hacia la bodega de tránsito</p>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {/* Sección para agregar productos */}
          <div className="p-4 border border-default-200 rounded-lg">
            <h3 className="font-semibold mb-4">Agregar Producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Autocomplete
                label="Producto"
                placeholder="Buscar producto"
                selectedKey={productoSeleccionado}
                onSelectionChange={(key) => setProductoSeleccionado(key as string)}
                allowsCustomValue={false}
              >
                {productos.map((producto) => (
                  <AutocompleteItem key={producto.id}>
                    <div className="flex flex-col">
                      <span className="text-small">{producto.nombre}</span>
                      <span className="text-tiny text-default-400">
                        Stock: {producto.stock} {producto.unidadMedida}
                      </span>
                    </div>
                  </AutocompleteItem>
                ))}
              </Autocomplete>
              
              <Input
                type="number"
                label="Cantidad"
                placeholder="0"
                value={cantidad}
                onValueChange={setCantidad}
                min="0.01"
                step="0.01"
                endContent={
                  <span className="text-tiny text-default-400">
                    {productoSeleccionadoObj?.unidadMedida || ''}
                  </span>
                }
              />
              
              <Input
                label="Notas (opcional)"
                placeholder="Observaciones"
                value={notas}
                onValueChange={setNotas}
              />
              
              <Button 
                color="primary"
                onPress={agregarProducto}
                isDisabled={!productoSeleccionado || !cantidad || parseFloat(cantidad) <= 0}
                className="h-14"
              >
                <Icon icon="lucide:plus" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Lista de productos agregados */}
          {itemsPedido.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Productos en el Pedido ({itemsPedido.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {itemsPedido.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-default-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.producto.nombre}</span>
                        <Chip size="sm" color="primary">
                          {item.cantidad} {item.producto.unidadMedida}
                        </Chip>
                      </div>
                      {item.notas && (
                        <p className="text-sm text-default-500 mt-1">{item.notas}</p>
                      )}
                    </div>
                    <Button 
                      isIconOnly
                      variant="light"
                      color="danger"
                      size="sm"
                      onPress={() => eliminarItem(item.id)}
                    >
                      <Icon icon="lucide:trash-2" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen */}
          {itemsPedido.length > 0 && (
            <div className="p-4 bg-default-50 dark:bg-default-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total de productos:</span>
                <span className="text-lg font-bold text-primary">{itemsPedido.length}</span>
              </div>
              <p className="text-sm text-default-500 mt-2">
                Los productos se moverán del inventario principal a la bodega de tránsito
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>
          Cancelar
        </Button>
        <Button 
          color="primary"
          onPress={procesarPedido}
          isDisabled={itemsPedido.length === 0}
          startContent={<Icon icon="lucide:send" />}
        >
          Procesar Pedido ({itemsPedido.length})
        </Button>
      </ModalFooter>
    </>
  );
};

export default InventarioPage;