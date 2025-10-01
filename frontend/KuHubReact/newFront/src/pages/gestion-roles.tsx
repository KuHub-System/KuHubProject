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
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { IRole } from '../types/user.types';
// 🔥 IMPORTAR EL HELPER DE ROLES
import { guardarRoles, obtenerRoles } from '../services/roles-helper';

/**
 * Datos de ejemplo para los roles.
 * Estos son los roles por defecto que aparecen la primera vez
 */
const rolesIniciales: IRole[] = [
  {
    id: '1',
    nombre: 'Admin',
    permisos: ['dashboard', 'inventario', 'solicitud', 'gestion-pedidos', 'conglomerado-pedidos', 'gestion-proveedores', 'bodega-transito', 'gestion-recetas', 'ramos-admin', 'gestion-roles']
  },
  {
    id: '2',
    nombre: 'Co-Admin',
    permisos: ['dashboard', 'inventario', 'solicitud', 'gestion-pedidos', 'conglomerado-pedidos', 'gestion-proveedores', 'bodega-transito', 'gestion-recetas', 'ramos-admin']
  },
  {
    id: '3',
    nombre: 'Gestor de Pedidos',
    permisos: ['dashboard', 'gestion-pedidos', 'conglomerado-pedidos']
  },
  {
    id: '4',
    nombre: 'Profesor a Cargo',
    permisos: ['dashboard', 'solicitud']
  },
  {
    id: '5',
    nombre: 'Encargado de Bodega',
    permisos: ['dashboard', 'inventario']
  },
  {
    id: '6',
    nombre: 'Asistente de Bodega',
    permisos: ['dashboard', 'bodega-transito']
  }
];

/**
 * Lista de páginas disponibles en el sistema.
 */
const paginasDisponibles = [
  { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Panel principal con estadísticas' },
  { id: 'inventario', nombre: 'Inventario', descripcion: 'Gestión de productos' },
  { id: 'solicitud', nombre: 'Solicitud', descripcion: 'Creación de solicitudes de insumos' },
  { id: 'gestion-pedidos', nombre: 'Gestión de Pedidos', descripcion: 'Administración de pedidos' },
  { id: 'conglomerado-pedidos', nombre: 'Conglomerado de Pedidos', descripcion: 'Agrupación de pedidos' },
  { id: 'gestion-proveedores', nombre: 'Gestión de Proveedores', descripcion: 'Administración de proveedores' },
  { id: 'bodega-transito', nombre: 'Bodega de Tránsito', descripcion: 'Control de productos en tránsito' },
  { id: 'gestion-recetas', nombre: 'Gestión de Recetas', descripcion: 'Administración de recetas' },
  { id: 'ramos-admin', nombre: 'Ramos Admin', descripcion: 'Administración de asignaturas' },
  { id: 'gestion-roles', nombre: 'Gestión de Roles', descripcion: 'Administración de roles y permisos' }
];

/**
 * 🔥 FUNCIÓN MEJORADA: Cargar roles usando el helper
 */
const cargarRolesDelAlmacenamiento = (): IRole[] => {
  const roles = obtenerRoles();
  return roles.length > 0 ? roles : rolesIniciales;
};

/**
 * Página de gestión de roles mejorada.
 * Ahora notifica cambios para sincronización en tiempo real
 */
const GestionRolesPage: React.FC = () => {
  // ESTADO DEL COMPONENTE
  const [roles, setRoles] = React.useState<IRole[]>(() => cargarRolesDelAlmacenamiento());
  const [rolSeleccionado, setRolSeleccionado] = React.useState<IRole | null>(null);
  const [modalMode, setModalMode] = React.useState<'crear' | 'editar'>('crear');
  const [loading, setLoading] = React.useState<boolean>(false);
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  /**
   * 🔥 EFECTO MEJORADO: Guardar y notificar cambios
   * Ahora usa guardarRoles() que automáticamente notifica a todos los usuarios
   */
  React.useEffect(() => {
    console.log('💾 Guardando roles y notificando cambios...');
    guardarRoles(roles); // Usa la función del helper que notifica automáticamente
  }, [roles]);

  /**
   * Abre el modal para crear un nuevo rol.
   */
  const handleNuevoRol = () => {
    setModalMode('crear');
    setRolSeleccionado(null);
    onOpen();
  };

  /**
   * Abre el modal para editar un rol existente.
   */
  const handleEditarRol = (rol: IRole) => {
    setModalMode('editar');
    setRolSeleccionado(rol);
    onOpen();
  };

  /**
   * Elimina un rol del sistema.
   */
  const handleEliminarRol = (id: string) => {
    const rolAEliminar = roles.find(rol => rol.id === id);
    
    if (rolAEliminar?.nombre === 'Admin') {
      alert('No se puede eliminar el rol de Administrador');
      return;
    }
    
    if (window.confirm('¿Está seguro de que desea eliminar este rol?')) {
      setLoading(true);
      
      setTimeout(() => {
        const nuevosRoles = roles.filter(rol => rol.id !== id);
        setRoles(nuevosRoles);
        console.log('🗑️ Rol eliminado, notificación enviada');
        setLoading(false);
      }, 300);
    }
  };

  /**
   * Resetea los roles a su configuración inicial
   */
  const resetearRoles = () => {
    if (window.confirm('¿Está seguro de que desea resetear todos los roles a su configuración inicial?')) {
      setLoading(true);
      
      setTimeout(() => {
        setRoles(rolesIniciales);
        console.log('🔄 Roles reseteados, notificación enviada');
        setLoading(false);
      }, 500);
    }
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
            <h1 className="text-2xl font-bold mb-2">Gestión de Roles</h1>
            <p className="text-default-500">
              Administre los roles y permisos del sistema. Los cambios se aplican inmediatamente.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              color="warning" 
              variant="flat"
              startContent={<Icon icon="lucide:refresh-cw" />}
              onPress={resetearRoles}
              isLoading={loading}
            >
              Resetear
            </Button>
            <Button 
              color="primary" 
              startContent={<Icon icon="lucide:plus" />}
              onPress={handleNuevoRol}
              isDisabled={loading}
            >
              Nuevo Rol
            </Button>
          </div>
        </div>

        {/* 🔥 INDICADOR MEJORADO */}
        {roles.length > 0 && (
          <div className="bg-success-50 border border-success-200 text-success-700 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Icon icon="lucide:check-circle" className="text-xl flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Sistema sincronizado:</strong> {roles.length} roles configurados.
                Los cambios se aplican automáticamente a todos los usuarios activos.
              </div>
            </div>
          </div>
        )}

        {/* Tabla de roles */}
        <Card className="shadow-sm">
          <CardBody className="p-0">
            <Table 
              aria-label="Tabla de roles del sistema"
              removeWrapper
            >
              <TableHeader>
                <TableColumn>NOMBRE DEL ROL</TableColumn>
                <TableColumn>PERMISOS ASIGNADOS</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody>
                {roles.map((rol) => (
                  <TableRow key={rol.id}>
                    <TableCell>
                      <div className="font-medium text-lg">{rol.nombre}</div>
                      <div className="text-sm text-default-500">
                        ID: {rol.id} • {rol.permisos.length} permisos
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rol.permisos.length > 0 ? (
                          rol.permisos.map((permiso) => {
                            const pagina = paginasDisponibles.find(p => p.id === permiso);
                            return (
                              <Chip 
                                key={permiso} 
                                size="sm"
                                variant="flat"
                                color="primary"
                              >
                                {pagina?.nombre || permiso}
                              </Chip>
                            );
                          })
                        ) : (
                          <span className="text-danger text-sm">Sin permisos asignados</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm"
                          onPress={() => handleEditarRol(rol)}
                          isDisabled={loading}
                          title="Editar rol"
                        >
                          <Icon icon="lucide:edit" className="text-primary" />
                        </Button>
                        <Button 
                          isIconOnly 
                          variant="light" 
                          size="sm"
                          onPress={() => handleEliminarRol(rol.id)}
                          isDisabled={loading || rol.nombre === 'Admin'}
                          title={rol.nombre === 'Admin' ? 'No se puede eliminar el rol Admin' : 'Eliminar rol'}
                        >
                          <Icon 
                            icon="lucide:trash" 
                            className={rol.nombre === 'Admin' ? 'text-default-300' : 'text-danger'} 
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </motion.div>

      {/* Modal para crear/editar rol */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl">
        <ModalContent>
          {(onClose) => (
            <FormularioRol 
              rol={rolSeleccionado} 
              mode={modalMode}
              rolesExistentes={roles}
              onClose={onClose}
              onSave={(nuevoRol) => {
                setLoading(true);
                
                setTimeout(() => {
                  if (modalMode === 'crear') {
                    const rolConId = { 
                      ...nuevoRol, 
                      id: Date.now().toString()
                    };
                    setRoles([...roles, rolConId]);
                    console.log('✅ Nuevo rol creado:', rolConId.nombre);
                  } else {
                    setRoles(roles.map(r => r.id === nuevoRol.id ? nuevoRol : r));
                    console.log('✅ Rol actualizado:', nuevoRol.nombre);
                  }
                  setLoading(false);
                  onClose();
                }, 300);
              }}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

/**
 * Interfaz para las propiedades del componente FormularioRol.
 */
interface FormularioRolProps {
  rol: IRole | null;
  mode: 'crear' | 'editar';
  rolesExistentes: IRole[];
  onClose: () => void;
  onSave: (rol: IRole) => void;
}

/**
 * Componente de formulario para crear o editar un rol.
 */
const FormularioRol: React.FC<FormularioRolProps> = ({ 
  rol, 
  mode, 
  rolesExistentes,
  onClose, 
  onSave 
}) => {
  const [nombre, setNombre] = React.useState<string>(rol?.nombre || '');
  const [permisos, setPermisos] = React.useState<string[]>(rol?.permisos || []);
  const [errores, setErrores] = React.useState<string[]>([]);
  const [guardando, setGuardando] = React.useState<boolean>(false);

  const handlePermisoChange = (permisoId: string, isChecked: boolean) => {
    if (isChecked) {
      if (!permisos.includes(permisoId)) {
        setPermisos([...permisos, permisoId]);
      }
    } else {
      setPermisos(permisos.filter(p => p !== permisoId));
    }
    
    if (errores.length > 0) {
      setErrores([]);
    }
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: string[] = [];

    if (!nombre.trim()) {
      nuevosErrores.push('El nombre del rol es obligatorio');
    } else if (nombre.trim().length < 3) {
      nuevosErrores.push('El nombre del rol debe tener al menos 3 caracteres');
    }

    if (mode === 'crear' || (rol && rol.nombre !== nombre.trim())) {
      const rolExistente = rolesExistentes.find(r => 
        r.nombre.toLowerCase() === nombre.trim().toLowerCase()
      );
      if (rolExistente) {
        nuevosErrores.push('Ya existe un rol con ese nombre');
      }
    }

    if (permisos.length === 0) {
      nuevosErrores.push('Debe seleccionar al menos un permiso');
    }

    setErrores(nuevosErrores);
    return nuevosErrores.length === 0;
  };

  const handleSubmit = () => {
    if (!validarFormulario()) {
      return;
    }

    setGuardando(true);

    setTimeout(() => {
      const rolAGuardar: IRole = {
        id: rol?.id || '',
        nombre: nombre.trim(),
        permisos: [...permisos]
      };

      onSave(rolAGuardar);
      setGuardando(false);
    }, 500);
  };

  const toggleTodosLosPermisos = () => {
    if (permisos.length === paginasDisponibles.length) {
      setPermisos([]);
    } else {
      setPermisos(paginasDisponibles.map(p => p.id));
    }
  };

  const todosMarcados = permisos.length === paginasDisponibles.length;

  return (
    <>
      <ModalHeader>
        <div className="flex items-center gap-2">
          <Icon 
            icon={mode === 'crear' ? 'lucide:plus-circle' : 'lucide:edit'} 
            className="text-primary" 
          />
          {mode === 'crear' ? 'Crear Nuevo Rol' : `Editar Rol: ${rol?.nombre}`}
        </div>
      </ModalHeader>
      
      <ModalBody>
        <div className="space-y-6">
          {errores.length > 0 && (
            <Card className="bg-danger-50 border-danger-200">
              <CardBody className="p-4">
                <div className="flex items-start gap-2">
                  <Icon icon="lucide:alert-circle" className="text-danger mt-0.5" />
                  <div>
                    <p className="text-danger font-medium mb-1">Errores en el formulario:</p>
                    <ul className="text-danger text-sm space-y-1">
                      {errores.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
          
          <Input
            label="Nombre del Rol"
            placeholder="Ej: Supervisor de Inventario"
            value={nombre}
            onValueChange={setNombre}
            isDisabled={guardando || (mode === 'editar' && rol?.nombre === 'Admin')}
            description="El nombre debe ser único y descriptivo"
            isInvalid={errores.some(e => e.includes('nombre'))}
          />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Permisos del Sistema</p>
                <p className="text-xs text-default-500">
                  Seleccione las páginas a las que este rol tendrá acceso
                </p>
              </div>
              
              <Button
                size="sm"
                variant="flat"
                color={todosMarcados ? "warning" : "primary"}
                onPress={toggleTodosLosPermisos}
                isDisabled={guardando || (mode === 'editar' && rol?.nombre === 'Admin')}
              >
                {todosMarcados ? 'Desmarcar Todos' : 'Marcar Todos'}
              </Button>
            </div>
            
            <Card>
              <CardBody className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginasDisponibles.map((pagina) => (
                    <Checkbox
                      key={pagina.id}
                      isSelected={permisos.includes(pagina.id)}
                      onValueChange={(isSelected) => handlePermisoChange(pagina.id, isSelected)}
                      isDisabled={guardando || (mode === 'editar' && rol?.nombre === 'Admin')}
                    >
                      <div>
                        <p className="font-medium text-sm">{pagina.nombre}</p>
                        <p className="text-xs text-default-500">{pagina.descripcion}</p>
                      </div>
                    </Checkbox>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-default-600">
                    <Icon icon="lucide:info" className="inline mr-1" />
                    {permisos.length} de {paginasDisponibles.length} permisos seleccionados
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </ModalBody>
      
      <ModalFooter>
        <Button 
          variant="flat" 
          onPress={onClose}
          isDisabled={guardando}
        >
          Cancelar
        </Button>
        <Button 
          color="primary" 
          onPress={handleSubmit}
          isDisabled={guardando || (mode === 'editar' && rol?.nombre === 'Admin')}
          isLoading={guardando}
          startContent={!guardando && <Icon icon="lucide:save" />}
        >
          {guardando 
            ? 'Guardando...' 
            : mode === 'crear' 
              ? 'Crear Rol' 
              : 'Guardar Cambios'
          }
        </Button>
      </ModalFooter>
    </>
  );
};

export default GestionRolesPage;