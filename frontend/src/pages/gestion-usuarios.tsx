import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, Button, Input, Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Chip, Avatar, Tooltip, Divider, Selection
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { IUsuario, IUsuarioCreacion, RolUsuario } from '../types/usuario.types';
import {
  obtenerUsuariosService,
  crearUsuarioService,
  actualizarUsuarioService,
  eliminarUsuarioService,
  activarUsuarioService,
  subirFotoPerfilService
} from '../services/usuario-service';
import { useAuth } from '../contexts/auth-context';

const ROLES: RolUsuario[] = [
  'Administrador',
  'Co-Administrador',
  'Gestor de Pedidos',
  'Profesor a Cargo',
  'Encargado de Bodega',
  'Asistente de Bodega'
];




const GestionUsuariosPage: React.FC = () => {
  const opcionesRol = ['Todos los roles', ...ROLES];
  const { user: usuarioActual, hasSpecificPermission } = useAuth();
  const [usuarios, setUsuarios] = useState<IUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [rolFiltro, setRolFiltro] = useState<Selection>(new Set([]));

  // Modal de crear/editar
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<IUsuario | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState<IUsuarioCreacion>({
    nombreCompleto: '',
    correo: '',
    contrasena: '',
    rol: 'Profesor a Cargo',
    fotoPerfil: undefined
  });
  const [selectedRolForm, setSelectedRolForm] = useState<Selection>(new Set(['Profesor a Cargo']));
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar permisos
  useEffect(() => {
    if (!hasSpecificPermission('gestion-usuarios')) {
      window.location.href = '/';
    }
  }, [hasSpecificPermission]);

  // Cargar usuarios
  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await obtenerUsuariosService();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setUsuarioEditando(null);
    setFormData({
      nombreCompleto: '',
      correo: '',
      contrasena: '',
      rol: 'Profesor a Cargo',
      fotoPerfil: undefined
    });
    setSelectedRolForm(new Set(['Profesor a Cargo']));
    setArchivoFoto(null);
    onOpen();
  };

  const abrirModalEditar = (usuario: IUsuario) => {
    setModoEdicion(true);
    setUsuarioEditando(usuario);
    setFormData({
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo,
      contrasena: '',
      rol: usuario.rol,
      fotoPerfil: usuario.fotoPerfil
    });
    setSelectedRolForm(new Set([usuario.rol]));
    setArchivoFoto(null);
    onOpen();
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor seleccione una imagen válida');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar los 2MB');
        return;
      }
      setArchivoFoto(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!formData.nombreCompleto || !formData.correo || !formData.rol) {
        alert('Por favor complete todos los campos obligatorios');
        return;
      }

      if (!modoEdicion && !formData.contrasena) {
        alert('La contraseña es obligatoria para nuevos usuarios');
        return;
      }

      let fotoBase64 = formData.fotoPerfil;
      if (archivoFoto) {
        fotoBase64 = await subirFotoPerfilService(archivoFoto);
      }

      const dataConFoto = {
        ...formData,
        fotoPerfil: fotoBase64
      };

      if (modoEdicion && usuarioEditando) {
        const dataActualizacion: any = {
          nombreCompleto: dataConFoto.nombreCompleto,
          correo: dataConFoto.correo,
          rol: dataConFoto.rol,
          fotoPerfil: dataConFoto.fotoPerfil
        };
        
        if (formData.contrasena) {
          dataActualizacion.contrasena = formData.contrasena;
        }

        await actualizarUsuarioService(usuarioEditando.id, dataActualizacion);
        alert('✅ Usuario actualizado correctamente');
      } else {
        await crearUsuarioService(dataConFoto);
        alert('✅ Usuario creado correctamente');
      }

      await cargarUsuarios();
      onOpenChange();
    } catch (error: any) {
      alert(error.message || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (usuario: IUsuario) => {
    if (!window.confirm(`¿Está seguro de desactivar al usuario ${usuario.nombreCompleto}?`)) {
      return;
    }

    try {
      await eliminarUsuarioService(usuario.id);
      alert('✅ Usuario desactivado correctamente');
      await cargarUsuarios();
    } catch (error: any) {
      alert(error.message || 'Error al desactivar usuario');
    }
  };

  const handleActivar = async (usuario: IUsuario) => {
    try {
      await activarUsuarioService(usuario.id);
      alert('✅ Usuario activado correctamente');
      await cargarUsuarios();
    } catch (error: any) {
      alert(error.message || 'Error al activar usuario');
    }
  };

  // Obtener el valor seleccionado del filtro
  const rolFiltroSeleccionado = React.useMemo(() => {
    if (rolFiltro === "all") return '';
    return Array.from(rolFiltro)[0] as string || '';
  }, [rolFiltro]);

  const usuariosFiltrados = usuarios.filter(u => {
    const coincideBusqueda = 
      u.nombreCompleto.toLowerCase().includes(filtro.toLowerCase()) ||
      u.correo.toLowerCase().includes(filtro.toLowerCase());
    
    const coincideRol = !rolFiltroSeleccionado || u.rol === rolFiltroSeleccionado;
    
    return coincideBusqueda && coincideRol;
  });

  const getColorRol = (rol: RolUsuario) => {
    switch (rol) {
      case 'Administrador': return 'danger';
      case 'Co-Administrador': return 'warning';
      case 'Gestor de Pedidos': return 'primary';
      case 'Profesor a Cargo': return 'success';
      case 'Encargado de Bodega': return 'secondary';
      case 'Asistente de Bodega': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">Gestión de Usuarios</h1>
            <p className="text-default-500">
              Administra los usuarios del sistema y sus permisos
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Icon icon="lucide:user-plus" />}
            onPress={abrirModalCrear}
          >
            Nuevo Usuario
          </Button>
        </div>

        <Card>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Buscar por nombre o correo..."
                value={filtro}
                onValueChange={setFiltro}
                startContent={<Icon icon="lucide:search" />}
                isClearable
                onClear={() => setFiltro('')}
              />
              
              <Select
                placeholder="Filtrar por rol"
                selectedKeys={rolFiltro}
                onSelectionChange={setRolFiltro}
              >
                {opcionesRol.map((rol, index) => (
                  <SelectItem key={index === 0 ? 'todos' : rol}>
                    {rol}
                  </SelectItem>
                ))}
              </Select>

              <div className="flex gap-4 items-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{usuarios.length}</p>
                  <p className="text-xs text-default-500">Total</p>
                </div>
                <Divider orientation="vertical" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    {usuarios.filter(u => u.activo).length}
                  </p>
                  <p className="text-xs text-default-500">Activos</p>
                </div>
                <Divider orientation="vertical" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-danger">
                    {usuarios.filter(u => !u.activo).length}
                  </p>
                  <p className="text-xs text-default-500">Inactivos</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-0">
            <Table aria-label="Tabla de usuarios">
              <TableHeader>
                <TableColumn>USUARIO</TableColumn>
                <TableColumn>CORREO</TableColumn>
                <TableColumn>ROL</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ÚLTIMO ACCESO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No hay usuarios para mostrar">
                {usuariosFiltrados.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={usuario.fotoPerfil}
                          name={usuario.nombreCompleto}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{usuario.nombreCompleto}</p>
                          {(usuario.id === usuarioActual?.id || usuario.nombreCompleto === usuarioActual?.nombre) && (
                            <Chip size="sm" color="primary" variant="flat">Tú</Chip>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{usuario.correo}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={getColorRol(usuario.rol)}
                        variant="flat"
                      >
                        {usuario.rol}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={usuario.activo ? 'success' : 'danger'}
                        variant="flat"
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {usuario.ultimoAcceso
                        ? new Date(usuario.ultimoAcceso).toLocaleString('es-CL')
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Tooltip content="Editar">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => abrirModalEditar(usuario)}
                          >
                            <Icon icon="lucide:edit" className="text-primary" />
                          </Button>
                        </Tooltip>
                        
                        {usuario.activo ? (
                          <Tooltip content="Desactivar">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleEliminar(usuario)}
                              isDisabled={usuario.id === usuarioActual?.id || usuario.nombreCompleto === usuarioActual?.nombre}
                            >
                              <Icon icon="lucide:user-x" className="text-danger" />
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Activar">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleActivar(usuario)}
                            >
                              <Icon icon="lucide:user-check" className="text-success" />
                            </Button>
                          </Tooltip>
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

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Nombre Completo"
                    placeholder="Juan Pérez"
                    value={formData.nombreCompleto}
                    onValueChange={(val) => setFormData({ ...formData, nombreCompleto: val })}
                    isRequired
                  />

                  <Input
                    type="email"
                    label="Correo Electrónico"
                    placeholder="usuario@sistema.cl"
                    value={formData.correo}
                    onValueChange={(val) => setFormData({ ...formData, correo: val })}
                    isRequired
                  />

                  <Input
                    type="password"
                    label={modoEdicion ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña'}
                    placeholder="••••••••"
                    value={formData.contrasena}
                    onValueChange={(val) => setFormData({ ...formData, contrasena: val })}
                    isRequired={!modoEdicion}
                  />

                  <Select
                    label="Rol"
                    placeholder="Seleccione un rol"
                    selectedKeys={selectedRolForm}
                    onSelectionChange={(keys) => {
                      setSelectedRolForm(keys);
                      const selectedKey = Array.from(keys)[0];
                      if (selectedKey) {
                        setFormData({ ...formData, rol: selectedKey as RolUsuario });
                      }
                    }}
                    isRequired
                  >
                    {ROLES.map((rol) => (
                      <SelectItem key={rol}>{rol}</SelectItem>
                    ))}
                  </Select>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Foto de Perfil (Opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFotoChange}
                      className="block w-full text-sm text-default-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-white
                        hover:file:bg-primary-600
                        cursor-pointer"
                    />
                    <p className="text-xs text-default-400 mt-1">
                      PNG o JPG, máximo 2MB
                    </p>
                  </div>

                  {(formData.fotoPerfil || archivoFoto) && (
                    <div className="flex justify-center">
                      <Avatar
                        src={archivoFoto ? URL.createObjectURL(archivoFoto) : formData.fotoPerfil}
                        name={formData.nombreCompleto}
                        size="lg"
                      />
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                >
                  {modoEdicion ? 'Actualizar' : 'Crear Usuario'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default GestionUsuariosPage;