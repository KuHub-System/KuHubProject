/**
 * SERVICIO DE GESTIÓN DE USUARIOS - CONECTADO AL BACKEND
 * Se comunica con la API REST de Spring Boot
 */

import api from '../config/Axios';
import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion, IPaginatedUsuarioResponse, IUsuarioEstado, RolUsuario } from '../types/usuario.types';

/**
 * Mapeo centralizado de roles Frontend → Backend
 */
const ROL_MAP: { [key: string]: number } = {
  'Administrador': 1,
  'Co-Administrador': 2,
  'Gestor de Pedidos': 3,
  'Profesor a Cargo': 4,
  'Docente': 5,
  'Profesor': 5,
  'Encargado de Bodega': 6,
  'Asistente de Bodega': 7
};

/**
 * Mapeo inverso: ID de rol Backend → nombre de rol para el selector del modal.
 * Para ID 5 se usa 'Profesor' porque 'Docente' no aparece en el ROLES del selector.
 */
const ID_ROL_A_NOMBRE: { [key: number]: RolUsuario } = {
  1: 'Administrador',
  2: 'Co-Administrador',
  3: 'Gestor de Pedidos',
  4: 'Profesor a Cargo',
  5: 'Profesor',
  6: 'Encargado de Bodega',
  7: 'Asistente de Bodega'
};

export const obtenerNombreRolPorId = (idRol: number): RolUsuario =>
  ID_ROL_A_NOMBRE[idRol] ?? 'Profesor';

/**
 * Función helper para obtener el ID del rol con validación
 */
const obtenerIdRol = (nombreRol: string): number => {
  const idRol = ROL_MAP[nombreRol];
  if (!idRol) {
    throw new Error(`Rol '${nombreRol}' no válido.`);
  }
  return idRol;
};

/**
 * Obtener primera página de usuarios (Compatibilidad)
 */
export const obtenerUsuariosService = async (): Promise<IUsuario[]> => {
  const response = await obtenerUsuariosPaginadosService(1);
  return response.content;
};

/**
 * Convierte una lista de nombres de rol del frontend a IDs únicos del backend.
 * 'Docente' y 'Profesor' comparten el id 5, por eso se deduplican.
 */
export const rolesNombresAIds = (roles: string[]): number[] => {
  const ids = roles
    .map(r => ROL_MAP[r])
    .filter((id): id is number => typeof id === 'number');
  return Array.from(new Set(ids));
};

/**
 * Obtener usuarios paginados - BACKEND
 * POST /v1/usuarios/find-all-users-with-pagination
 * @param roles IDs de rol a filtrar (opcional). Vacío = sin filtro.
 */
export const obtenerUsuariosPaginadosService = async (
  page: number,
  roles: number[] = []
): Promise<IPaginatedUsuarioResponse> => {
  try {
    const response = await api.post('/usuarios/find-all-users-with-pagination', { page, roles });
    return {
      content: response.data.content.map((usuario: any) => convertirPaginatedUsuarioBackendAFrontend(usuario)),
      pagination: response.data.pagination
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al cargar usuarios paginados');
  }
};

/**
 * Buscar usuarios por filtro - BACKEND
 * POST /v1/usuarios/find-users-by-filter
 * @param roles IDs de rol a filtrar (opcional). Vacío = sin filtro.
 */
export const buscarUsuariosService = async (
  term: string,
  page: number,
  roles: number[] = []
): Promise<IPaginatedUsuarioResponse> => {
  try {
    const response = await api.post('/usuarios/find-users-by-filter', { term, page, roles });
    return {
      content: response.data.content.map((usuario: any) => convertirPaginatedUsuarioBackendAFrontend(usuario)),
      pagination: response.data.pagination
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al buscar usuarios');
  }
};

/**
 * Obtener el estado de conexión de todos los usuarios - BACKEND
 * GET /v1/usuarios/online-status
 * Endpoint ligero: solo email + ultimoAcceso + activo, para refrescar la columna "Estado".
 */
export const obtenerEstadoUsuariosService = async (): Promise<IUsuarioEstado[]> => {
  try {
    const response = await api.get('/usuarios/online-status');
    return (response.data || []).map((u: any) => ({
      correo: u.email,
      ultimoAcceso: u.ultimoAcceso,
      activo: u.activo
    }));
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al obtener estado de usuarios');
  }
};

/**
 * Función helper para convertir usuario paginado del backend al formato frontend
 */
function convertirPaginatedUsuarioBackendAFrontend(u: any): IUsuario {
  const idRol: number | undefined = u.idRol ?? undefined;
  return {
    id: u.idUsuario ? u.idUsuario.toString() : u.email,
    idUsuario: u.idUsuario ?? undefined,
    idRol,
    nombreCompleto: u.nombreCompleto,
    correo: u.email,
    contrasena: '',
    username: u.username,
    primerNombre: u.primerNombre,
    segundoNombre: u.segundoNombre,
    apellidoPaterno: u.apellidoPaterno,
    apellidoMaterno: u.apellidoMaterno,
    rol: idRol ? (ID_ROL_A_NOMBRE[idRol] ?? u.rolFormateado) : u.rolFormateado,
    fotoPerfil: u.urlFotoPerfil,
    activo: u.activo,
    fechaCreacion: u.fechaCreacion || '',
    ultimoAcceso: u.ultimoAcceso
  };
}

/**
 * Crear nuevo usuario - BACKEND
 * POST /v1/usuarios/create-user
 */
export const crearUsuarioService = async (data: IUsuarioCreacion): Promise<IUsuario> => {
  try {
    const payload = {
      primeroNombre: data.primeroNombre,
      segundoNombre: data.segundoNombre || null,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno || null,
      username: data.username,
      email: data.email,
      password: data.password,
      idRol: obtenerIdRol(data.rol),
      fotoPerfil: data.fotoPerfil || null,
      activo: true
    };

    const response = await api.post('/usuarios/create-user', payload);
    if (typeof response.data === 'boolean' && !response.data) {
      throw new Error('El servidor no pudo crear el usuario');
    }
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al crear usuario');
  }
};

/**
 * Actualizar usuario - BACKEND
 * PATCH /v1/usuarios/update-user
 */
export const actualizarUsuarioService = async (
  currentEmail: string,
  data: IUsuarioActualizacion
): Promise<boolean> => {
  try {
    const payload = {
      primeroNombre: data.primeroNombre,
      segundoNombre: data.segundoNombre || null,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno || null,
      username: data.username,
      email: data.email,
      password: data.password || null,
      idRol: data.rol ? obtenerIdRol(data.rol) : null
    };

    const response = await api.patch(`/usuarios/update-user/${currentEmail}`, payload);

    if (typeof response.data === 'boolean') {
      return response.data;
    }
    return true;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
  }
};

/**
 * Eliminar usuario (desactivar) - BACKEND
 * DELETE /v1/usuarios/delete-user/{email}
 */
export const eliminarUsuarioService = async (email: string): Promise<void> => {
  try {
    await api.delete(`/usuarios/delete-user/${email}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al desactivar usuario');
  }
};

/**
 * Subir foto de perfil (convierte a base64)
 */
export const subirFotoPerfilService = (archivo: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(archivo);
  });
};

/**
 * Función para satisfacer dependencias de inicialización heredadas
 */
export const inicializarUsuariosPorDefecto = (): void => { };

export const obtenerRolesDisponibles = (): string[] => Object.keys(ROL_MAP);
export const validarNombreRol = (nombreRol: string): boolean => nombreRol in ROL_MAP;

let cacheGestores: { idUsuario: number; nombreCompleto: string }[] | null = null;

/**
 * Obtener usuarios que pueden ser gestores de asignatura
 * GET /v1/usuarios/users-to-manager-course
 */
export const obtenerUsuariosGestoresAsignaturaService = async (): Promise<{ idUsuario: number; nombreCompleto: string }[]> => {
  if (cacheGestores) return cacheGestores;
  try {
    const response = await api.get('/usuarios/users-to-manager-course');
    cacheGestores = response.data;
    return cacheGestores || [];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al cargar gestores de asignatura');
  }
};

/**
 * Obtener usuarios que pueden ser asignados como docente de sección
 * GET /v1/usuarios/users-assigned-to-section
 */
export const obtenerUsuariosAsignadosSeccionService = async (): Promise<{ idUsuario: number; nombreCompleto: string }[]> => {
  try {
    const response = await api.get('/usuarios/users-assigned-to-section');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al cargar docentes disponibles');
  }
};