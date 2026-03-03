import React from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Card,
  CardBody,
  Input,
  Chip,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Textarea,
  Select,
  SelectItem
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast, useConfirm } from '../hooks/useToast';
import { useAuth } from '../contexts/auth-context';

// IMPORTAR TIPOS Y SERVICIOS
import { IReceta, IIngrediente } from '../types/receta.types';
import { IProducto } from '../types/producto.types';
import {
  obtenerRecetasService,
  crearRecetaService,
  actualizarRecetaService,
  cambiarEstadoRecetaService,
  eliminarRecetaService,
} from '../services/receta-service';
import { obtenerProductosService } from '../services/producto-service';

/**
 * Página de gestión de recetas simplificada.
 */
const GestionRecetasPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const esSoloLectura = user?.rol === 'Profesor';
  const esAdministrador = user?.rol === 'Administrador';

  const [recetas, setRecetas] = React.useState<IReceta[]>([]);
  const [productos, setProductos] = React.useState<IProducto[]>([]);
  const [filteredRecetas, setFilteredRecetas] = React.useState<IReceta[]>([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = React.useState<IReceta | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar' | 'ver'>('crear');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  // Cargar recetas y productos al montar el componente
  React.useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [recetasCargadas, productosCargados] = await Promise.all([
        obtenerRecetasService(),
        obtenerProductosService()
      ]);
      setRecetas(recetasCargadas);
      setProductos(productosCargados);
    } catch (error) {
      toast.error('Error al cargar las recetas');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    let filtered = [...recetas];
    if (searchTerm) {
      filtered = filtered.filter(receta =>
        receta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receta.descripcion && receta.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredRecetas(filtered);
    setCurrentPage(1);
  }, [searchTerm, recetas]);

  const paginatedRecetas = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredRecetas.slice(start, end);
  }, [currentPage, filteredRecetas, rowsPerPage]);

  const handleNuevaReceta = () => {
    setModalMode('crear');
    setRecetaSeleccionada(null);
    onOpen();
  };

  const handleEditarReceta = (receta: IReceta) => {
    setModalMode('editar');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const handleVerReceta = (receta: IReceta) => {
    setModalMode('ver');
    setRecetaSeleccionada(receta);
    onOpen();
  };

  const cambiarEstadoReceta = async (id: string, nuevoEstado: 'Activa' | 'Inactiva') => {
    try {
      await cambiarEstadoRecetaService(id, nuevoEstado === 'Activa');
      await cargarDatos();
      toast.success(`Receta ${nuevoEstado.toLowerCase()} correctamente`);
    } catch (error) {
      toast.error('Error al cambiar el estado de la receta');
    }
  };

  const handleGuardarReceta = async (receta: IReceta) => {
    try {
      if (modalMode === 'crear') {
        await crearRecetaService({
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          ingredientes: receta.ingredientes.map(ing => ({
            productoId: ing.productoId,
            productoNombre: ing.productoNombre,
            cantidad: ing.cantidad,
            unidadMedida: ing.unidadMedida
          })),
          instrucciones: receta.instrucciones,
          estado: receta.estado
        });
        toast.success('Receta creada correctamente');
      } else if (modalMode === 'editar') {
        await actualizarRecetaService({
          id: receta.id,
          nombre: receta.nombre,
          descripcion: receta.descripcion,
          ingredientes: receta.ingredientes,
          instrucciones: receta.instrucciones,
          estado: receta.estado
        });
        toast.success('Receta actualizada correctamente');
      }
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la receta');
      throw error;
    }
  };

  const handleEliminarReceta = async (receta: IReceta) => {
    if (!esAdministrador) {
      toast.warning('Solo el rol Administrador puede eliminar recetas.');
      return;
    }

    const confirmado = await confirm(
      `Eliminarás definitivamente la receta "${receta.nombre}".`,
      {
        title: 'Eliminar receta',
        confirmText: 'Eliminar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextHelper: 'Esta acción es irreversible. Escribe ELIMINAR para confirmar.',
      }
    );

    if (!confirmado) return;

    try {
      await eliminarRecetaService(receta.id);
      toast.success('Receta eliminada correctamente');
      await cargarDatos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la receta');
    }
  };

  const renderEstado = (estado: string) => {
    switch (estado) {
      case 'Activa': return <Chip color="success" size="sm">{estado}</Chip>;
      case 'Inactiva': return <Chip color="danger" size="sm">{estado}</Chip>;
      default: return <Chip size="sm">{estado}</Chip>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-default-500">Cargando recetas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          <div>
            {esSoloLectura && (
              <p className="text-sm text-warning-600 font-medium mt-1">
                Rol Profesor: acceso de solo lectura. Para crear o modificar recetas, contacte al profesor a cargo.
              </p>
            )}
          </div>
          {!esSoloLectura && (
            <Button
              color="primary"
              variant="solid"
              className="font-bold text-secondary shadow-md"
              startContent={<Icon icon="lucide:plus" width={20} />}
              onPress={handleNuevaReceta}
            >
              Nueva Receta
            </Button>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-6">
              <div>
                <p className="text-sm text-default-500 font-bold uppercase">Total Recetas</p>
                <p className="text-4xl font-bold text-primary mt-1">{recetas.length}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full text-primary">
                <Icon icon="lucide:book-open" width={32} />
              </div>
            </CardBody>
          </Card>
          <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-6">
              <div>
                <p className="text-sm text-default-500 font-bold uppercase">Activas</p>
                <p className="text-4xl font-bold text-success mt-1">
                  {recetas.filter(r => r.estado === 'Activa').length}
                </p>
              </div>
              <div className="p-3 bg-success-50 rounded-full text-success">
                <Icon icon="lucide:check-circle" width={32} />
              </div>
            </CardBody>
          </Card>
          <Card className="shadow-sm border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
            <CardBody className="flex flex-row items-center justify-between p-6">
              <div>
                <p className="text-sm text-default-500 font-bold uppercase">Inactivas</p>
                <p className="text-4xl font-bold text-danger mt-1">
                  {recetas.filter(r => r.estado === 'Inactiva').length}
                </p>
              </div>
              <div className="p-3 bg-danger-50 rounded-full text-danger">
                <Icon icon="lucide:x-circle" width={32} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Buscar recetas por nombre o descripción..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Icon icon="lucide:search" className="text-default-400" />}
                isClearable
                onClear={() => setSearchTerm('')}
                className="w-full md:w-1/3"
                variant="bordered"
                classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
              />
            </div>
          </CardBody>
        </Card>

        {/* Tabla */}
        <Card className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de recetas"
              removeWrapper
              classNames={{
                th: "bg-default-100 dark:bg-default-50/50 text-default-500 font-bold uppercase text-xs h-12",
                td: "py-3 border-b border-default-50 dark:border-default-50/20 group-data-[last=true]:border-none"
              }}
              bottomContent={
                filteredRecetas.length > rowsPerPage && (
                  <div className="flex w-full justify-center py-4 border-t border-default-100">
                    <Pagination
                      total={Math.ceil(filteredRecetas.length / rowsPerPage)}
                      page={currentPage}
                      onChange={setCurrentPage}
                      showControls
                      color="primary"
                    />
                  </div>
                )
              }
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>DESCRIPCIÓN</TableColumn>
                <TableColumn>INGREDIENTES</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  <div className="py-12 text-center text-default-400">
                    <Icon icon="lucide:book-x" className="mx-auto mb-3 opacity-50" width={48} />
                    <p className="text-lg font-medium">No se encontraron recetas</p>
                  </div>
                }
              >
                {paginatedRecetas.map((receta) => (
                  <TableRow key={receta.id} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                    <TableCell>
                      <p className="font-semibold text-secondary dark:text-foreground">{receta.nombre}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-default-500 line-clamp-2">
                        {receta.descripcion || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">
                        {receta.ingredientes.length} ingredientes
                      </Chip>
                    </TableCell>
                    <TableCell>{renderEstado(receta.estado)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => handleVerReceta(receta)}
                          className="text-default-400 hover:text-primary"
                        >
                          <Icon icon="lucide:eye" width={18} />
                        </Button>
                        {!esSoloLectura && (
                          <>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              onPress={() => handleEditarReceta(receta)}
                              className="text-default-400 hover:text-secondary"
                            >
                              <Icon icon="lucide:edit" width={18} />
                            </Button>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              onPress={() => cambiarEstadoReceta(
                                receta.id,
                                receta.estado === 'Activa' ? 'Inactiva' : 'Activa'
                              )}
                              className={receta.estado === 'Activa' ? 'text-default-400 hover:text-danger' : 'text-default-400 hover:text-success'}
                            >
                              <Icon
                                icon={receta.estado === 'Activa' ? 'lucide:x-circle' : 'lucide:check-circle'}
                                width={18}
                              />
                            </Button>
                            {esAdministrador && (
                              <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={() => handleEliminarReceta(receta)}
                                className="text-default-400 hover:text-danger"
                              >
                                <Icon icon="lucide:trash" width={18} />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <DetalleReceta
              receta={recetaSeleccionada}
              mode={modalMode}
              productos={productos}
              onClose={onClose}
              onSave={async (nuevaReceta) => {
                try {
                  await handleGuardarReceta(nuevaReceta);
                  onClose();
                } catch (error) {
                  // Error ya manejado
                }
              }}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

interface DetalleRecetaProps {
  receta: IReceta | null;
  mode: 'crear' | 'editar' | 'ver';
  productos: IProducto[];
  onClose: () => void;
  onSave: (receta: IReceta) => Promise<void>;
}

const DetalleReceta: React.FC<DetalleRecetaProps> = ({ receta, mode, productos, onClose, onSave }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const formRef = React.useRef<any>(null);

  const handleSubmit = async () => {
    if (formRef.current) {
      setIsSaving(true);
      try {
        await formRef.current.submit();
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <>
      <ModalHeader className="border-b border-default-100 dark:border-default-50/50 bg-secondary-50 dark:bg-content2">
        <div className="flex items-center gap-2">
          <Icon icon={mode === 'crear' ? 'lucide:plus-circle' : mode === 'editar' ? 'lucide:edit-3' : 'lucide:book-open'} className="text-secondary dark:text-secondary-400" width={24} />
          <span className="font-bold text-lg text-secondary dark:text-foreground">
            {mode === 'crear' ? 'Nueva Receta' : mode === 'editar' ? 'Editar Receta' : 'Detalle de Receta'}
          </span>
        </div>
      </ModalHeader>
      <ModalBody>
        {mode === 'ver' ? (
          receta && <VistaReceta receta={receta} />
        ) : (
          <FormularioReceta
            ref={formRef}
            receta={receta}
            mode={mode}
            productos={productos}
            onSave={onSave}
          />
        )}
      </ModalBody>
      <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50/50">
        <Button variant="ghost" onPress={onClose} isDisabled={isSaving} className="font-medium">
          {mode === 'ver' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {mode !== 'ver' && (
          <Button
            color="primary"
            variant="solid"
            onPress={handleSubmit}
            isLoading={isSaving}
            isDisabled={isSaving}
            className="font-bold text-secondary shadow-md"
            startContent={<Icon icon="lucide:save" />}
          >
            {mode === 'crear' ? 'Crear Receta' : 'Guardar Cambios'}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

interface VistaRecetaProps {
  receta: IReceta;
}

const VistaReceta: React.FC<VistaRecetaProps> = ({ receta }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">{receta.nombre}</h3>
        {receta.descripcion && (
          <p className="text-default-500">{receta.descripcion}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-default-500">Estado</p>
          <Chip color={receta.estado === 'Activa' ? 'success' : 'danger'} size="sm">
            {receta.estado}
          </Chip>
        </div>
        <div>
          <p className="text-sm text-default-500">Ingredientes</p>
          <p className="font-medium">{receta.ingredientes.length} ingredientes</p>
        </div>
      </div>

      <Divider />

      <div>
        <h4 className="font-semibold mb-3">📦 Ingredientes</h4>
        <Table aria-label="Ingredientes" removeWrapper>
          <TableHeader>
            <TableColumn>INGREDIENTE</TableColumn>
            <TableColumn>CANTIDAD</TableColumn>
          </TableHeader>
          <TableBody>
            {receta.ingredientes.map((ingrediente) => (
              <TableRow key={ingrediente.id}>
                <TableCell>{ingrediente.productoNombre}</TableCell>
                <TableCell className="font-semibold">
                  {ingrediente.cantidad} {ingrediente.unidadMedida}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Divider />

      <div>
        <h4 className="font-semibold mb-3">📝 Instrucciones</h4>
        <div className="whitespace-pre-line bg-default-50 dark:bg-default-100/30 p-4 rounded-md text-sm">
          {receta.instrucciones || 'Sin instrucciones'}
        </div>
      </div>
    </div>
  );
};

interface FormularioRecetaProps {
  receta: IReceta | null;
  mode: 'crear' | 'editar';
  productos: IProducto[];
  onSave: (receta: IReceta) => Promise<void>;
}

const FormularioReceta = React.forwardRef<any, FormularioRecetaProps>(
  ({ receta, mode, productos, onSave }, ref) => {
    const toast = useToast();
    const [nombre, setNombre] = React.useState(receta?.nombre || '');
    const [descripcion, setDescripcion] = React.useState(receta?.descripcion || '');
    const [instrucciones, setInstrucciones] = React.useState(receta?.instrucciones || '');
    const [estado, setEstado] = React.useState<'Activa' | 'Inactiva'>(receta?.estado || 'Activa');
    const [ingredientes, setIngredientes] = React.useState<IIngrediente[]>(receta?.ingredientes || []);

    React.useImperativeHandle(ref, () => ({
      submit: async () => {
        // Validaciones
        if (!nombre.trim()) {
          toast.warning('El nombre de la receta es obligatorio');
          throw new Error('El nombre es requerido');
        }
        if (ingredientes.length === 0) {
          toast.warning('Debe agregar al menos un ingrediente');
          throw new Error('Debe agregar al menos un ingrediente');
        }

        // Validar que todos los ingredientes tengan producto y cantidad
        for (let i = 0; i < ingredientes.length; i++) {
          const ing = ingredientes[i];
          if (!ing.productoId) {
            toast.warning(`Seleccione un producto para el ingrediente ${i + 1}`);
            throw new Error('Producto no seleccionado');
          }
          if (ing.cantidad <= 0) {
            toast.warning(`La cantidad del ingrediente ${i + 1} debe ser mayor a 0`);
            throw new Error('Cantidad inválida');
          }
        }

        const recetaData: IReceta = {
          id: receta?.id || '',
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          ingredientes,
          instrucciones: instrucciones.trim(),
          estado,
          fechaCreacion: receta?.fechaCreacion || new Date().toISOString(),
          fechaActualizacion: new Date().toISOString(),
        };

        await onSave(recetaData);
      }
    }));

    const agregarIngrediente = () => {
      const nuevoIngrediente: IIngrediente = {
        id: Date.now().toString(),
        productoId: '',
        productoNombre: '',
        cantidad: 0,
        unidadMedida: ''
      };
      setIngredientes([...ingredientes, nuevoIngrediente]);
    };

    const actualizarIngrediente = (index: number, campo: keyof IIngrediente, valor: any) => {
      const nuevosIngredientes = [...ingredientes];

      if (campo === 'productoId') {
        const producto = productos.find(p => p.id === valor);
        if (producto) {
          nuevosIngredientes[index] = {
            ...nuevosIngredientes[index],
            productoId: producto.id,
            productoNombre: producto.nombre,
            unidadMedida: producto.unidadMedida
          };
        }
      } else {
        nuevosIngredientes[index] = {
          ...nuevosIngredientes[index],
          [campo]: valor
        };
      }

      setIngredientes(nuevosIngredientes);
    };

    const eliminarIngrediente = (index: number) => {
      setIngredientes(ingredientes.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-4">
        <Input
          label="Nombre de la Receta"
          placeholder="Ej: Pan Amasado, Torta de Chocolate, etc."
          value={nombre}
          onValueChange={setNombre}
          isRequired
          variant="bordered"
        />

        <Textarea
          label="Descripción (Opcional)"
          placeholder="Descripción breve de la receta..."
          value={descripcion}
          onValueChange={setDescripcion}
          variant="bordered"
          minRows={2}
        />

        <Divider />

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">📦 Ingredientes</h4>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<Icon icon="lucide:plus" />}
              onPress={agregarIngrediente}
            >
              Agregar
            </Button>
          </div>

          {ingredientes.length === 0 ? (
            <div className="text-center p-8 bg-default-50 dark:bg-default-100/30 rounded-lg">
              <Icon icon="lucide:package-open" className="text-default-300 text-4xl mx-auto mb-2" />
              <p className="text-default-500 text-sm">
                No hay ingredientes. Click en "Agregar" para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredientes.map((ingrediente, index) => (
                <Card key={ingrediente.id || index} shadow="none" className="border-2 border-default-200 dark:border-default-100 dark:bg-content1">
                  <CardBody className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto_auto] gap-3 items-end">
                      <Select
                        label="Producto"
                        placeholder="Seleccione producto"
                        selectedKeys={ingrediente.productoId ? [ingrediente.productoId] : []}
                        onSelectionChange={(keys) => actualizarIngrediente(index, 'productoId', Array.from(keys)[0])}
                        size="sm"
                        variant="bordered"
                        classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                        isRequired
                        items={productos}
                      >
                        {(producto) => (
                          <SelectItem key={producto.id}>
                            {producto.nombre}
                          </SelectItem>
                        )}
                      </Select>

                      <Input
                        type="number"
                        label="Cantidad"
                        placeholder="0"
                        value={ingrediente.cantidad.toString()}
                        onValueChange={(val) => actualizarIngrediente(index, 'cantidad', parseFloat(val) || 0)}
                        size="sm"
                        variant="bordered"
                        min="0"
                        step="0.01"
                        endContent={
                          <span className="text-xs text-default-400">
                            {ingrediente.unidadMedida || 'unidad'}
                          </span>
                        }
                      />

                      <span className="text-sm text-default-500 mb-2">
                        {ingrediente.unidadMedida || '-'}
                      </span>

                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        color="danger"
                        onPress={() => eliminarIngrediente(index)}
                      >
                        <Icon icon="lucide:trash" />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Divider />

        <Textarea
          label="Instrucciones (Opcional)"
          placeholder="Paso 1: ...&#10;Paso 2: ...&#10;Paso 3: ..."
          value={instrucciones}
          onValueChange={setInstrucciones}
          variant="bordered"
          minRows={5}
        />

        <Select
          label="Estado"
          selectedKeys={[estado]}
          onSelectionChange={(keys) => setEstado(Array.from(keys)[0] as 'Activa' | 'Inactiva')}
          variant="bordered"
        >
          <SelectItem key="Activa">Activa</SelectItem>
          <SelectItem key="Inactiva">Inactiva</SelectItem>
        </Select>
      </div>
    );
  }
);

export default GestionRecetasPage;