import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, Button, Input, Select, SelectItem,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Chip, Avatar, Tooltip, Divider, Selection
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion, RolUsuario } from '../types/usuario.types';
import {
  crearUsuarioService,
  actualizarUsuarioService,
  eliminarUsuarioService,
  subirFotoPerfilService,
  obtenerUsuariosPaginadosService,
  buscarUsuariosService,
  obtenerEstadoUsuariosService,
  rolesNombresAIds,
  obtenerNombreRolPorId
} from '../services/usuario-service';
import { useAuth } from '../contexts/auth-context';
import { useModulePermission } from '../contexts/permission-context';
import { useToast, useConfirm } from '../hooks/useToast';
import { usePageTitle } from '../hooks/usePageTitle';
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
  const { user: usuarioActual } = useAuth();
  const { canCreate: usuPuedeCrear, canUpdate: usuPuedeEditar, canDelete: usuPuedeEliminar } = useModulePermission('GESTION_USUARIOS');
  const [usuarios, setUsuarios] = useState<IUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  // Filtro por rol (multi-select). rolesSeleccion = lo marcado en el dropdown (no consulta);
  // rolesAplicados = IDs ya confirmados que SÍ disparan la consulta (se setea al cerrar el selector).
  const [rolesSeleccion, setRolesSeleccion] = useState<Selection>(new Set([]));
  const [rolesAplicados, setRolesAplicados] = useState<number[]>([]);

  // Pagination states
  const [totalPages, setTotalPages] = useState<number>(1);
  const nextPageRef = React.useRef<number>(2);
  const lastLoadedPageRef = React.useRef<number>(1);
  const isLoadingMoreRef = React.useRef<boolean>(false);
  const isLoadingRef = React.useRef<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  usePageTitle('Gestión de Usuarios', 'Administra los usuarios del sistema y sus permisos', 'lucide:user-cog');

  // Modal de crear/editar
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<IUsuario | null>(null);

  // Formulario
  const [formData, setFormData] = useState<IUsuarioCreacion>({
    primeroNombre: '',
    segundoNombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    username: '',
    email: '',
    password: '',
    confirmarPassword: '',
    rol: 'Profesor',
    fotoPerfil: undefined
  });
  const [selectedRolForm, setSelectedRolForm] = useState<Selection>(new Set(['Profesor']));
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialFormData, setInitialFormData] = useState<IUsuarioCreacion | null>(null);

  // Debounce de búsqueda
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filtro);
    }, 2500);
    return () => clearTimeout(timer);
  }, [filtro]);

  // Recargar la lista cuando cambia la búsqueda o el filtro de roles aplicado
  useEffect(() => {
    cargarUsuarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, rolesAplicados]);

  // Mantener isLoadingRef sincronizado
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Poll ligero cada 60 s: actualiza SOLO la columna de estado (activo/último acceso)
  // de los usuarios ya cargados, sin re-paginar ni reordenar la tabla.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isLoadingRef.current || isLoadingMoreRef.current) return;
      try {
        const estados = await obtenerEstadoUsuariosService();
        const mapa = new Map(estados.map(e => [e.correo, e]));
        setUsuarios(prev => prev.map(u => {
          const e = mapa.get(u.correo);
          return e ? { ...u, ultimoAcceso: e.ultimoAcceso, activo: e.activo } : u;
        }));
      } catch {
        /* fallo silencioso: no molestar al usuario por un refresco de estado */
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchPage = React.useCallback((page: number) =>
    debouncedSearch.trim()
      ? buscarUsuariosService(debouncedSearch.trim(), page, rolesAplicados)
      : obtenerUsuariosPaginadosService(page, rolesAplicados),
  [debouncedSearch, rolesAplicados]);

  // Confirma el filtro de roles al cerrar el selector (clic afuera). Solo consulta si cambió.
  const aplicarFiltroRoles = () => {
    const nombres = Array.from(rolesSeleccion as Set<React.Key>).map(String);
    const ids = rolesNombresAIds(nombres);
    const nuevoKey = [...ids].sort((a, b) => a - b).join(',');
    const actualKey = [...rolesAplicados].sort((a, b) => a - b).join(',');
    if (nuevoKey !== actualKey) {
      setRolesAplicados(ids);
    }
  };

  const cargarUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await fetchPage(1);
      setUsuarios(data.content);
      setTotalPages(data.pagination.totalPages);
      nextPageRef.current = 2;
      lastLoadedPageRef.current = 1;
    } catch (error) {
      logger.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  // Recarga todas las páginas ya visibles (usado tras crear/editar/eliminar)
  const recargarLista = async () => {
    const paginas = lastLoadedPageRef.current;
    try {
      setIsLoading(true);
      const resultados = await Promise.all(
        Array.from({ length: paginas }, (_, i) => fetchPage(i + 1))
      );
      setUsuarios(resultados.flatMap(r => r.content));
      setTotalPages(resultados[0].pagination.totalPages);
      nextPageRef.current = paginas + 1;
    } catch (error) {
      logger.error('Error al recargar lista:', error);
      toast.error('Error al actualizar la lista');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMasUsuarios = React.useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    const pageToLoad = nextPageRef.current;
    try {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      const data = await fetchPage(pageToLoad);
      setUsuarios(prev => {
        const existentes = new Set(prev.map(u => u.correo));
        const nuevos = data.content.filter(u => !existentes.has(u.correo));
        return [...prev, ...nuevos];
      });
      nextPageRef.current = pageToLoad + 1;
      lastLoadedPageRef.current = pageToLoad;
    } catch (error) {
      logger.error('Error cargando más usuarios:', error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [fetchPage]);

  // Scroll listener — mismo patrón que inventario.tsx
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isLoading || isLoadingRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = el;
      if (scrollTop + clientHeight > scrollHeight - 300) {
        if (nextPageRef.current <= totalPages) {
          cargarMasUsuarios();
        }
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isLoading, usuarios.length, totalPages, cargarMasUsuarios]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setUsuarioEditando(null);
    setFormData({
      primeroNombre: '',
      segundoNombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      username: '',
      email: '',
      password: '',
      confirmarPassword: '',
      rol: 'Profesor',
      fotoPerfil: undefined
    });
    setInitialFormData(null);
    setSelectedRolForm(new Set(['Profesor']));
    setArchivoFoto(null);
    onOpen();
  };

  const abrirModalEditar = (usuario: IUsuario) => {
    setModoEdicion(true);
    setUsuarioEditando(usuario);

    // Usar idRol para mapear al nombre exacto del selector (evita mismatch con el string formateado)
    const rolParaSelector: RolUsuario = usuario.idRol
      ? obtenerNombreRolPorId(usuario.idRol)
      : usuario.rol;

    const datosBase = {
      primeroNombre: usuario.primerNombre || '',
      segundoNombre: usuario.segundoNombre || '',
      apellidoPaterno: usuario.apellidoPaterno || '',
      apellidoMaterno: usuario.apellidoMaterno || '',
      username: usuario.username || usuario.correo.split('@')[0],
      email: usuario.correo,
      password: '',
      confirmarPassword: '',
      rol: rolParaSelector,
      fotoPerfil: usuario.fotoPerfil
    };

    setFormData(datosBase);
    setInitialFormData(datosBase);
    setSelectedRolForm(new Set([rolParaSelector]));
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

      const fieldsRequired = [
        formData.primeroNombre,
        formData.apellidoPaterno,
        formData.username,
        formData.email,
        formData.rol
      ];

      if (fieldsRequired.some(f => !f)) {
        toast.warning('Por favor complete todos los campos obligatorios');
        return;
      }

      if (!modoEdicion && !formData.password) {
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
        const dataActualizacion: IUsuarioActualizacion = {
          primeroNombre: dataConFoto.primeroNombre,
          segundoNombre: dataConFoto.segundoNombre,
          apellidoPaterno: dataConFoto.apellidoPaterno,
          apellidoMaterno: dataConFoto.apellidoMaterno,
          username: dataConFoto.username,
          email: dataConFoto.email,
          rol: dataConFoto.rol as RolUsuario,
          fotoPerfil: dataConFoto.fotoPerfil
        };

        if (formData.password) {
          dataActualizacion.password = formData.password;
        }

        await actualizarUsuarioService(usuarioEditando.correo, dataActualizacion);
        toast.success('Usuario actualizado correctamente');
      } else {
        await crearUsuarioService(dataConFoto);
        toast.success('Usuario creado correctamente');
      }

      await recargarLista();
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
      await eliminarUsuarioService(usuario.correo);
      toast.success('Usuario desactivado correctamente');
      await recargarLista();
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar usuario');
    }
  };

  // No hay filtros adicionales por ahora
  const usuariosFiltrados = usuarios;

  const isFormInvalid = React.useMemo(() => {
    const { primeroNombre, apellidoPaterno, username, email, password, confirmarPassword, rol } = formData;

    if (!primeroNombre || !apellidoPaterno || !username || !email || !rol) return true;
    if (username.length < 8) return true;
    if (!email.includes('@') || !email.includes('.')) return true;

    if (!modoEdicion) {
      if (!password || password.length < 8) return true;
      if (password !== confirmarPassword) return true;
    } else {
      if (password && password.length > 0) {
        if (password.length < 8) return true;
        if (password !== confirmarPassword) return true;
      }
    }

    if (modoEdicion && initialFormData) {
      const hasDataChanges =
        primeroNombre !== initialFormData.primeroNombre ||
        formData.segundoNombre !== initialFormData.segundoNombre ||
        apellidoPaterno !== initialFormData.apellidoPaterno ||
        formData.apellidoMaterno !== initialFormData.apellidoMaterno ||
        username !== initialFormData.username ||
        email !== initialFormData.email ||
        rol !== initialFormData.rol ||
        (password !== '' && password.length >= 8);

      const hasPhotoChanges = archivoFoto !== null;
      if (!hasDataChanges && !hasPhotoChanges) return true;
    }

    return false;
  }, [formData, modoEdicion, initialFormData, archivoFoto]);

  const getColorRol = (rol: string) => {
    switch (rol) {
      case 'Administrador': return 'danger';
      case 'Co-Administrador': return 'warning';
      case 'Gestor de Pedidos': return 'primary';
      case 'Profesor a Cargo': return 'success';
      case 'Encargado de Bodega': return 'secondary';
      case 'Asistente de Bodega': return 'default';
      case 'Docente': case 'Profesor': return 'success';
      default: return 'default';
    }
  };

  // 10 min = ventana activa para considerar al usuario en línea
  const UMBRAL_EN_LINEA_MS = 10 * 60 * 1000;

  const estaEnLinea = (usuario: IUsuario): boolean => {
    if (!usuario.activo || !usuario.ultimoAcceso) return false;
    return Date.now() - new Date(usuario.ultimoAcceso).getTime() < UMBRAL_EN_LINEA_MS;
  };

  const getEstadoOnline = (usuario: IUsuario): { color: 'success' | 'danger' | 'default'; label: string; tooltip: string } => {
    if (!usuario.activo) return { color: 'danger', label: 'Inactivo', tooltip: 'Cuenta desactivada' };
    if (estaEnLinea(usuario)) return { color: 'success', label: 'En línea', tooltip: 'Con actividad en los últimos 10 minutos' };
    return { color: 'default', label: 'Desconectado', tooltip: usuario.ultimoAcceso ? 'Sin actividad reciente en el sistema' : 'Nunca ha iniciado sesión' };
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
                  aria-label="Filtrar por rol"
                  selectionMode="multiple"
                  placeholder="Todos los roles"
                  selectedKeys={rolesSeleccion}
                  onSelectionChange={setRolesSeleccion}
                  onOpenChange={(open) => { if (!open) aplicarFiltroRoles(); }}
                  variant="bordered"
                  startContent={<Icon icon="lucide:filter" className="text-default-400 flex-shrink-0" />}
                  classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
                  renderValue={(items) =>
                    items.length === 0
                      ? 'Todos los roles'
                      : `${items.length} rol${items.length > 1 ? 'es' : ''} seleccionado${items.length > 1 ? 's' : ''}`
                  }
                >
                  {ROLES.map((rol) => (
                    <SelectItem key={rol}>{rol}</SelectItem>
                  ))}
                </Select>
              </div>

              {usuPuedeCrear && (
              <Button
                color="primary"
                variant="solid"
                className="font-bold text-secondary shadow-md w-full md:w-auto"
                startContent={<Icon icon="lucide:user-plus" width={20} />}
                onPress={abrirModalCrear}
              >
                Nuevo Usuario
              </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-md border border-default-200 dark:border-default-100 bg-white dark:bg-content1">
          <CardBody className="p-0">
            <div ref={scrollerRef} className="overflow-auto max-h-[calc(100vh-300px)] min-h-[300px] rounded-xl">
              <div className="min-w-[900px] w-full">
            <Table
              aria-label="Tabla de usuarios"
              removeWrapper
              layout="fixed"
              classNames={{
                table: "w-full",
                th: "bg-default-100 dark:bg-default-100 text-default-500 font-bold uppercase text-xs h-12 sticky top-0 z-20 border-b border-default-200/50 shadow-sm outline-none",
                td: "py-3 border-b border-default-50 dark:border-default-50/20 group-data-[last=true]:border-none"
              }}
            >
              <TableHeader>
                <TableColumn align="center" width="25%">USUARIO</TableColumn>
                <TableColumn align="center" width="15%">NOMBRE USUARIO</TableColumn>
                <TableColumn align="center" width="20%">CORREO</TableColumn>
                <TableColumn align="center" width="15%">ROL</TableColumn>
                <TableColumn align="center" width="10%">ESTADO</TableColumn>
                <TableColumn align="center" width="15%">ÚLTIMO ACCESO</TableColumn>
                <TableColumn align="center" width={100}>ACCIONES</TableColumn>
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
                  <TableRow key={usuario.id + usuario.correo} className="hover:bg-default-50 dark:hover:bg-default-100/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={usuario.fotoPerfil}
                          name={usuario.nombreCompleto}
                          size="md"
                          isBordered
                          color={estaEnLinea(usuario) ? "success" : !usuario.activo ? "danger" : "default"}
                          className="flex-shrink-0"
                          classNames={{ img: "scale-90" }}
                        />
                        <div className="overflow-hidden">
                          <Tooltip content={usuario.nombreCompleto} delay={1000}>
                            <p className="font-semibold text-secondary dark:text-foreground truncate">{usuario.nombreCompleto}</p>
                          </Tooltip>
                          {(usuario.id === usuarioActual?.id || usuario.nombreCompleto === usuarioActual?.nombre) && (
                            <Chip size="sm" color="primary" variant="flat" className="text-[10px] h-5">Tú</Chip>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip content={usuario.username} delay={1000}>
                        <span className="text-default-600 truncate block">{usuario.username || '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip content={usuario.correo} delay={1000}>
                        <span className="text-default-600 truncate block">{usuario.correo}</span>
                      </Tooltip>
                    </TableCell>
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
                      {(() => {
                        const estado = getEstadoOnline(usuario);
                        return (
                          <Tooltip content={estado.tooltip} delay={600} size="sm">
                            <Chip
                              size="sm"
                              color={estado.color}
                              variant="dot"
                              className="border-none cursor-default"
                            >
                              {estado.label}
                            </Chip>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-default-600">
                        {usuario.ultimoAcceso
                          ? new Date(usuario.ultimoAcceso).toLocaleString('es-CL')
                          : <span className="text-default-400 italic">Nunca</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Tooltip content={usuPuedeEditar ? "Editar" : "Sin permiso de edición"}>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => abrirModalEditar(usuario)}
                            isDisabled={!usuPuedeEditar}
                            className="text-default-400 hover:text-primary"
                          >
                            <Icon icon="lucide:edit" width={18} />
                          </Button>
                        </Tooltip>

                        {usuario.activo && (
                          <Tooltip content={!usuPuedeEliminar ? "Sin permiso de desactivación" : "Desactivar"}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => handleEliminar(usuario)}
                              isDisabled={
                                !usuPuedeEliminar ||
                                usuario.id === usuarioActual?.id ||
                                usuario.nombreCompleto === usuarioActual?.nombre
                              }
                              className="text-default-400 hover:text-danger"
                            >
                              <Icon icon="lucide:user-x" width={18} />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {isLoadingMore && (
              <div className="flex justify-center py-4 border-t border-default-100 dark:border-default-50">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span>Cargando más usuarios...</span>
                </div>
              </div>
            )}
              </div>
            </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Primer Nombre"
                      placeholder="Juan"
                      value={formData.primeroNombre}
                      onValueChange={(val) => setFormData({ ...formData, primeroNombre: val })}
                      isRequired
                      maxLength={50}
                      description={`${formData.primeroNombre.length}/50`}
                    />
                    <Input
                      label="Segundo Nombre"
                      placeholder="Andrés"
                      value={formData.segundoNombre}
                      onValueChange={(val) => setFormData({ ...formData, segundoNombre: val })}
                      maxLength={50}
                      description={`${(formData.segundoNombre || '').length}/50`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Apellido Paterno"
                      placeholder="Pérez"
                      value={formData.apellidoPaterno}
                      onValueChange={(val) => setFormData({ ...formData, apellidoPaterno: val })}
                      isRequired
                      maxLength={50}
                      description={`${formData.apellidoPaterno.length}/50`}
                    />
                    <Input
                      label="Apellido Materno"
                      placeholder="López"
                      value={formData.apellidoMaterno}
                      onValueChange={(val) => setFormData({ ...formData, apellidoMaterno: val })}
                      maxLength={50}
                      description={`${(formData.apellidoMaterno || '').length}/50`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Username"
                      placeholder="jperez"
                      value={formData.username}
                      onValueChange={(val) => setFormData({ ...formData, username: val })}
                      isRequired
                      maxLength={50}
                      description={`${formData.username.length}/50 (Min. 8)`}
                    />
                    <Input
                      type="email"
                      label="Correo Electrónico"
                      placeholder="usuario@sistema.cl"
                      value={formData.email}
                      onValueChange={(val) => setFormData({ ...formData, email: val })}
                      isRequired
                      maxLength={75}
                      description={`${formData.email.length}/75`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      type="password"
                      label={modoEdicion ? 'Nueva Contraseña' : 'Contraseña'}
                      placeholder="••••••••"
                      value={formData.password}
                      onValueChange={(val) => setFormData({ ...formData, password: val })}
                      isRequired={!modoEdicion}
                      maxLength={30}
                      description={modoEdicion
                        ? (formData.password ? `${formData.password.length}/30 (Min. 8)` : "Dejar vacío para mantener la actual")
                        : `${formData.password.length}/30 (Min. 8)`
                      }
                      color={formData.password && formData.password.length < 8 ? "danger" : "default"}
                    />
                    <Input
                      type="password"
                      label="Confirmar Contraseña"
                      placeholder="••••••••"
                      value={formData.confirmarPassword}
                      onValueChange={(val) => setFormData({ ...formData, confirmarPassword: val })}
                      isRequired={!modoEdicion || (formData.password?.length ?? 0) > 0}
                      maxLength={30}
                      color={formData.confirmarPassword && formData.confirmarPassword !== formData.password ? "danger" : "default"}
                      description={formData.confirmarPassword && formData.confirmarPassword !== formData.password ? "No coincide" : ""}
                    />
                  </div>

                  <Select
                    key={`rol-${modoEdicion ? (usuarioEditando?.idUsuario ?? usuarioEditando?.id ?? 'edit') : 'create'}`}
                    label="Rol"
                    placeholder="Seleccione un rol"
                    defaultSelectedKeys={new Set([formData.rol])}
                    onSelectionChange={(keys) => {
                      setSelectedRolForm(keys);
                      const selectedKey = Array.from(keys)[0];
                      if (selectedKey) {
                        setFormData(prev => ({ ...prev, rol: selectedKey as RolUsuario }));
                      }
                    }}
                    isRequired
                  >
                    {ROLES.map((rol) => (
                      <SelectItem key={rol}>{rol}</SelectItem>
                    ))}
                  </Select>

                  <div className="p-4 rounded-2xl bg-default-50 dark:bg-default-100/50 border border-default-200 dark:border-default-100">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-2.5 rounded-xl bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400">
                        <Icon icon="lucide:construction" width={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-secondary dark:text-foreground">Carga de Fotos en Mantenimiento</p>
                        <p className="text-xs text-default-500">Esta función no está disponible temporalmente.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-content1 border border-dashed border-default-300 dark:border-default-200 opacity-60">
                      <Button
                        size="sm"
                        variant="flat"
                        isDisabled
                        className="font-semibold"
                        startContent={<Icon icon="lucide:image-plus" width={16} />}
                      >
                        Seleccionar archivo
                      </Button>
                      <span className="text-xs text-default-400 italic">No disponible por actualizaciones</span>
                    </div>
                  </div>

                  {formData.fotoPerfil && (
                    <div className="flex justify-center pt-2">
                      <Avatar
                        src={formData.fotoPerfil}
                        name={formData.primeroNombre}
                        size="lg"
                        isBordered
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
                  isDisabled={isFormInvalid || isSubmitting}
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