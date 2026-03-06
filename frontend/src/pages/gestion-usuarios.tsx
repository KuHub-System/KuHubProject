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
import { useToast, useConfirm } from '../hooks/useToast';
import { logger } from '../utils/logger';

const ROLES: RolUsuario[] = [
  'Administrador',
  'Co-Administrador',
  'Gestor de Pedidos',
  'Profesor',
  'Profesor a Cargo',
  'Encargado de Bodega',
  'Asistente de Bodega'
];




const GestionUsuariosPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
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
    rol: 'Profesor',
    fotoPerfil: undefined
  });
  const [selectedRolForm, setSelectedRolForm] = useState<Selection>(new Set(['Profesor']));
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
      logger.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
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
      rol: 'Profesor',
      fotoPerfil: undefined
    });
    setSelectedRolForm(new Set(['Profesor']));
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
        toast.warning('Por favor seleccione una imagen válida');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.warning('La imagen no debe superar los 2MB');
        return;
      }
      setArchivoFoto(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!formData.nombreCompleto || !formData.correo || !formData.rol) {
        toast.warning('Por favor complete todos los campos obligatorios');
        return;
      }

      if (!modoEdicion && !formData.contrasena) {
        toast.warning('La contraseña es obligatoria para nuevos usuarios');
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
        toast.success('Usuario actualizado correctamente');
      } else {
        await crearUsuarioService(dataConFoto);
        toast.success('Usuario creado correctamente');
      }

      await cargarUsuarios();
      onOpenChange();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (usuario: IUsuario) => {
    if (usuarioActual?.rol !== 'Administrador') {
      toast.warning('Solo el rol Administrador puede desactivar usuarios.');
      return;
    }

    const result = await confirm(
      `Esta acción desactivará al usuario ${usuario.nombreCompleto}.`,
      {
        title: 'Desactivar usuario',
        confirmText: 'Desactivar',
        confirmColor: 'danger',
        requireText: 'ELIMINAR',
        requireTextLabel: 'Escribe "ELIMINAR" para confirmar',
        requireTextHelper: 'Usa esta opción solo para depurar datos de prueba.',
      }
    );
    if (!result) {
      return;
    }

    try {
      await eliminarUsuarioService(usuario.id);
      toast.success('Usuario desactivado correctamente');
      await cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar usuario');
    }
  };

  const handleActivar = async (usuario: IUsuario) => {
    try {
      await activarUsuarioService(usuario.id);
      toast.success('Usuario activado correctamente');
      await cargarUsuarios();
    } catch (error: any) {
      toast.error(error.message || 'Error al activar usuario');
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
          <p className="text-default-500">Cargando usuarios...</p>
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
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-default-200 dark:border-default-100 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary dark:text-foreground mb-2">Gestión de Usuarios</h1>
            <p className="text-default-500 text-lg">
              Administra los usuarios del sistema y sus permisos
            </p>
          </div>
          <Button
            color="primary"
            variant="solid"
            className="font-bold text-secondary shadow-md"
            startContent={<Icon icon="lucide:user-plus" width={20} />}
            onPress={abrirModalCrear}
          >
            Nuevo Usuario
          </Button>
        </div>

        <Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="w-full md:w-1/3">
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={filtro}
                  onValueChange={setFiltro}
                  startContent={<Icon icon="lucide:search" className="text-default-400" />}
                  isClearable
                  onClear={() => setFiltro('')}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
                />
              </div>

              <div className="w-full md:w-1/3">
                <Select
                  placeholder="Filtrar por rol"
                  selectedKeys={rolFiltro}
                  onSelectionChange={setRolFiltro}
                  variant="bordered"
                  classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                  startContent={<Icon icon="lucide:shield" className="text-default-400" />}
                >
                  {opcionesRol.map((rol, index) => (
                    <SelectItem key={index === 0 ? 'todos' : rol}>
                      {rol}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex gap-6 items-center bg-white dark:bg-content1 px-6 py-3 rounded-xl border border-default-200 dark:border-default-100 shadow-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{usuarios.length}</p>
                  <p className="text-xs text-default-500 font-semibold uppercase">Total</p>
                </div>
                <Divider orientation="vertical" className="h-8" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    {usuarios.filter(u => u.activo).length}
                  </p>
                  <p className="text-xs text-default-500 font-semibold uppercase">Activos</p>
                </div>
                <Divider orientation="vertical" className="h-8" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-danger">
                    {usuarios.filter(u => !u.activo).length}
                  </p>
                  <p className="text-xs text-default-500 font-semibold uppercase">Inactivos</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="p-0">
            <Table
              aria-label="Tabla de usuarios"
              removeWrapper
              classNames={{
                th: "bg-default-100 dark:bg-default-50 text-default-500 font-bold uppercase text-xs h-12",
                td: "py-3 border-b border-default-50 dark:border-default-50/20 group-data-[last=true]:border-none"
              }}
            >
              <TableHeader>
                <TableColumn>USUARIO</TableColumn>
                <TableColumn>CORREO</TableColumn>
                <TableColumn>ROL</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ÚLTIMO ACCESO</TableColumn>
                <TableColumn align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={
                  <div className="py-12 text-center text-default-400">
                    <Icon icon="lucide:users" className="mx-auto mb-3 opacity-50" width={48} />
                    <p className="text-lg font-medium">No se encontraron usuarios</p>
                  </div>
                }
              >
                {usuariosFiltrados.map((usuario) => (
                  <TableRow key={usuario.id} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={usuario.fotoPerfil}
                          name={usuario.nombreCompleto}
                          size="sm"
                          isBordered
                          color={usuario.activo ? "success" : "default"}
                        />
                        <div>
                          <p className="font-semibold text-secondary dark:text-foreground">{usuario.nombreCompleto}</p>
                          {(usuario.id === usuarioActual?.id || usuario.nombreCompleto === usuarioActual?.nombre) && (
                            <Chip size="sm" color="primary" variant="flat" className="text-[10px] h-5">Tú</Chip>
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
                        className="font-medium"
                      >
                        {usuario.rol}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={usuario.activo ? 'success' : 'danger'}
                        variant="dot"
                        className="border-none"
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {usuario.ultimoAcceso
                        ? <span className="text-sm text-default-600">{new Date(usuario.ultimoAcceso).toLocaleString('es-CL')}</span>
                        : <span className="text-default-400 italic">Nunca</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Tooltip content="Editar">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => abrirModalEditar(usuario)}
                            className="text-default-400 hover:text-primary"
                          >
                            <Icon icon="lucide:edit" width={18} />
                          </Button>
                        </Tooltip>

                        {usuario.activo ? (
                          <Tooltip content="Desactivar">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleEliminar(usuario)}
                              isDisabled={
                                usuario.id === usuarioActual?.id ||
                                usuario.nombreCompleto === usuarioActual?.nombre ||
                                usuarioActual?.rol !== 'Administrador'
                              }
                              className="text-default-400 hover:text-danger"
                            >
                              <Icon icon="lucide:user-x" width={18} />
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Activar">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleActivar(usuario)}
                              className="text-default-400 hover:text-success"
                            >
                              <Icon icon="lucide:user-check" width={18} />
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
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-secondary-50 dark:bg-secondary-50/10">
                <div className="flex items-center gap-2">
                  <Icon icon={modoEdicion ? "lucide:user-cog" : "lucide:user-plus"} className="text-secondary dark:text-secondary-400" width={24} />
                  <span className="font-bold text-lg text-secondary dark:text-foreground">
                    {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </span>
                </div>
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
              <ModalFooter className="bg-default-50 dark:bg-content2 border-t border-default-100 dark:border-default-50">
                <Button variant="ghost" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  className="font-bold text-secondary shadow-md"
                  startContent={<Icon icon="lucide:save" />}
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