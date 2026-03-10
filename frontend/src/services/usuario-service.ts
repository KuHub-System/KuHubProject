/**
 * SERVICIO DE GESTIÓN DE USUARIOS - CONECTADO AL BACKEND
 * Se comunica con la API REST de Spring Boot
 */

import api from '../config/Axios';
import { IUsuario, IUsuarioCreacion, IUsuarioActualizacion, IPaginatedUsuarioResponse } from '../types/usuario.types';

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
 * Obtener usuarios paginados - BACKEND
 * POST /v1/usuarios/find-all-users-with-pagination
 */
export const obtenerUsuariosPaginadosService = async (page: number): Promise<IPaginatedUsuarioResponse> => {
  try {
    const response = await api.post('/usuarios/find-all-users-with-pagination', page);
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
 */
export const buscarUsuariosService = async (term: string, page: number): Promise<IPaginatedUsuarioResponse> => {
  try {
    const response = await api.post('/usuarios/find-users-by-filter', { term, page });
    return {
      content: response.data.content.map((usuario: any) => convertirPaginatedUsuarioBackendAFrontend(usuario)),
      pagination: response.data.pagination
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error al buscar usuarios');
  }
};

/**
 * Función helper para convertir usuario paginado del backend al formato frontend
 */
function convertirPaginatedUsuarioBackendAFrontend(u: any): IUsuario {
  return {
    id: (u.idUsuario || u.email).toString(),
    nombreCompleto: u.nombreCompleto,
    correo: u.email,
    contrasena: '',
    username: u.username,
    primerNombre: u.primerNombre,
    segundoNombre: u.segundoNombre,
    apellidoPaterno: u.apellidoPaterno,
    apellidoMaterno: u.apellidoMaterno,
    rol: u.rolFormateado,
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