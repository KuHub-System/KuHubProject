package KuHub.modules.gestionusuario.service;

import KuHub.modules.gestionusuario.dtos.*;
import KuHub.modules.gestionusuario.entity.Rol;
import KuHub.modules.gestionusuario.entity.Usuario;
import KuHub.modules.gestionusuario.exceptions.*;
import KuHub.modules.gestionusuario.repository.RolRepository;
import KuHub.modules.gestionusuario.repository.UsuarioRepository;
import KuHub.utils.ImagenUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;


/**
 * Implementación del servicio de Usuarios
 */
@Service
public class UsuarioServiceImpl implements UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> obtenerTodos() {
        return usuarioRepository.findAllByOrderByFechaCreacionDesc()
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> obtenerActivos() {
        return usuarioRepository.findByActivoTrue()
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponseDTO obtenerPorId(Integer idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));
        return convertirADTO(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponseDTO obtenerPorEmail(String email) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsuarioNotFoundException("email", email));
        return convertirADTO(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> buscar(String busqueda) {
        return usuarioRepository.buscarPorNombreOEmail(busqueda)
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> obtenerPorRol(Integer idRol) {
        Rol rol = rolRepository.findById(idRol)
                .orElseThrow(() -> new RolNotFoundException(idRol));

        return usuarioRepository.findByRolAndActivoTrue(rol)
                .stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UsuarioResponseDTO crear(UsuarioRequestDTO usuarioRequestDTO) {
        // Validar que el email no exista
        if (usuarioRepository.existsByEmail(usuarioRequestDTO.getEmail())) {
            throw new EmailAlreadyExistsException(usuarioRequestDTO.getEmail());
        }

        // Validar que el username no exista (si se proporciona)
        if (usuarioRequestDTO.getUsername() != null &&
                !usuarioRequestDTO.getUsername().trim().isEmpty() &&
                usuarioRepository.existsByUsername(usuarioRequestDTO.getUsername())) {
            throw new UsernameAlreadyExistsException(usuarioRequestDTO.getUsername());
        }

        // Obtener el rol
        Rol rol = rolRepository.findById(usuarioRequestDTO.getIdRol())
                .orElseThrow(() -> new RolNotFoundException(usuarioRequestDTO.getIdRol()));

        // Crear usuario
        Usuario usuario = new Usuario();
        usuario.setRol(rol);
        usuario.setPrimerNombre(usuarioRequestDTO.getPrimerNombre());
        usuario.setSegundoNombre(usuarioRequestDTO.getSegundoNombre());
        usuario.setApellidoPaterno(usuarioRequestDTO.getApellidoPaterno());
        usuario.setApellidoMaterno(usuarioRequestDTO.getApellidoMaterno());
        usuario.setEmail(usuarioRequestDTO.getEmail().toLowerCase());
        usuario.setUsername(usuarioRequestDTO.getUsername());

        // En producción, hashear la contraseña con BCrypt
        usuario.setContrasena(usuarioRequestDTO.getContrasena());

        // FOTO PERFIL: convertir Base64 a byte[]
        if (usuarioRequestDTO.getFotoPerfil() != null
                && !usuarioRequestDTO.getFotoPerfil().isEmpty()) {

            try {
                byte[] fotoBytes = Base64.getDecoder().decode(usuarioRequestDTO.getFotoPerfil());

                // Validar tamaño máximo 10MB
                if (fotoBytes.length > 10 * 1024 * 1024) {
                    // Foto demasiado grande → se ignora y se guarda NULL
                    usuario.setFotoPerfil(null);
                } else {
                    usuario.setFotoPerfil(fotoBytes);
                }

            } catch (IllegalArgumentException e) {
                // Base64 inválido → se guarda NULL sin afectar la transacción
                usuario.setFotoPerfil(null);
            }
        }
        usuario.setActivo(usuarioRequestDTO.getActivo() != null ? usuarioRequestDTO.getActivo() : true);
        usuario.setFechaCreacion(LocalDateTime.now());

        Usuario usuarioGuardado = usuarioRepository.save(usuario);
        return convertirADTO(usuarioGuardado);
    }

    @Override
    @Transactional
    public UsuarioResponseDTO actualizar(Integer idUsuario, UsuarioUpdateDTO usuarioUpdateDTO) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));

        // Actualizar rol si se proporciona
        if (usuarioUpdateDTO.getIdRol() != null) {
            Rol rol = rolRepository.findById(usuarioUpdateDTO.getIdRol())
                    .orElseThrow(() -> new RolNotFoundException(usuarioUpdateDTO.getIdRol()));
            usuario.setRol(rol);
        }

        // Actualizar campos si se proporcionan
        if (usuarioUpdateDTO.getPrimerNombre() != null) {
            usuario.setPrimerNombre(usuarioUpdateDTO.getPrimerNombre());
        }
        if (usuarioUpdateDTO.getSegundoNombre() != null) {
            usuario.setSegundoNombre(usuarioUpdateDTO.getSegundoNombre());
        }
        if (usuarioUpdateDTO.getApellidoPaterno() != null) {
            usuario.setApellidoPaterno(usuarioUpdateDTO.getApellidoPaterno());
        }
        if (usuarioUpdateDTO.getApellidoMaterno() != null) {
            usuario.setApellidoMaterno(usuarioUpdateDTO.getApellidoMaterno());
        }

        // Validar email si se está actualizando
        if (usuarioUpdateDTO.getEmail() != null) {
            usuarioRepository.findByEmailIgnoreCase(usuarioUpdateDTO.getEmail())
                    .ifPresent(usuarioExistente -> {
                        if (!usuarioExistente.getIdUsuario().equals(idUsuario)) {
                            throw new EmailAlreadyExistsException(usuarioUpdateDTO.getEmail());
                        }
                    });
            usuario.setEmail(usuarioUpdateDTO.getEmail().toLowerCase());
        }

        // Validar username si se está actualizando
        if (usuarioUpdateDTO.getUsername() != null) {
            usuarioRepository.findByUsername(usuarioUpdateDTO.getUsername())
                    .ifPresent(usuarioExistente -> {
                        if (!usuarioExistente.getIdUsuario().equals(idUsuario)) {
                            throw new UsernameAlreadyExistsException(usuarioUpdateDTO.getUsername());
                        }
                    });
            usuario.setUsername(usuarioUpdateDTO.getUsername());
        }

        // Actualizar contraseña si se proporciona
        if (usuarioUpdateDTO.getContrasena() != null && !usuarioUpdateDTO.getContrasena().trim().isEmpty()) {
            // En producción, hashear con BCrypt
            usuario.setContrasena(usuarioUpdateDTO.getContrasena());
        }

        // Actualizar foto de perfil si se proporciona
        if (usuarioUpdateDTO.getFotoPerfil() != null && !usuarioUpdateDTO.getFotoPerfil().isEmpty()) {
            try {
                byte[] fotoBytes = Base64.getDecoder().decode(usuarioUpdateDTO.getFotoPerfil());

                // Validar tamaño máximo 10MB
                if (fotoBytes.length > 10 * 1024 * 1024) {
                    throw new IllegalArgumentException("La foto no puede superar 10MB");
                }

                usuario.setFotoPerfil(fotoBytes);

            } catch (IllegalArgumentException e) {
                // Base64 malformado u otro error → se inserta null sin detener la transacción
                usuario.setFotoPerfil(null);
                System.out.println("⚠️ Imagen inválida. Se guardó 'null' y el proceso continúa.");
            }
        }

        // Actualizar estado si se proporciona
        if (usuarioUpdateDTO.getActivo() != null) {
            usuario.setActivo(usuarioUpdateDTO.getActivo());
        }

        Usuario usuarioActualizado = usuarioRepository.save(usuario);
        return convertirADTO(usuarioActualizado);
    }

    @Override
    @Transactional
    public void desactivar(Integer idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }

    @Override
    @Transactional
    public void activar(Integer idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));
        usuario.setActivo(true);
        usuarioRepository.save(usuario);
    }

    @Override
    @Transactional
    public void eliminar(Integer idUsuario) {
        if (!usuarioRepository.existsById(idUsuario)) {
            throw new UsuarioNotFoundException(idUsuario);
        }
        usuarioRepository.deleteById(idUsuario);
    }

    @Override
    @Transactional
    public void cambiarContrasena(Integer idUsuario, String nuevaContrasena) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));

        // En producción, hashear con BCrypt
        usuario.setContrasena(nuevaContrasena);
        usuarioRepository.save(usuario);
    }

    @Override
    @Transactional
    public UsuarioResponseDTO actualizarFotoPerfil(Integer idUsuario, String fotoPerfil) {

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));

        if (fotoPerfil != null && !fotoPerfil.isEmpty()) {

            // Base64 → byte[]
            byte[] fotoBytes = Base64.getDecoder().decode(fotoPerfil);

            // Validar tamaño máximo 10MB
            if (fotoBytes.length > 10 * 1024 * 1024) {
                throw new IllegalArgumentException("La foto no puede superar 10MB");
            }

            // 🔍 VALIDAR que realmente es una imagen
            if (!ImagenUtils.esImagenValida(fotoBytes)) {
                throw new IllegalArgumentException("El archivo no es una imagen válida (JPG/PNG).");
            }

            usuario.setFotoPerfil(fotoBytes);
        }

        Usuario usuarioActualizado = usuarioRepository.save(usuario);
        return convertirADTO(usuarioActualizado);
    }


    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO loginRequestDTO) {
        // Buscar usuario por email
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(loginRequestDTO.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException());

        // Verificar que el usuario esté activo
        if (!usuario.getActivo()) {
            throw new UsuarioInactivoException();
        }

        // Verificar contraseña (en producción usar BCrypt.matches())
        if (!usuario.getContrasena().equals(loginRequestDTO.getContrasena())) {
            throw new InvalidCredentialsException();
        }

        // Actualizar último acceso
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);

        // Generar token (simulado - en producción usar JWT)
        String token = generarToken(usuario);

        // Crear respuesta
        UsuarioResponseDTO usuarioDTO = convertirADTO(usuario);
        return new LoginResponseDTO(usuarioDTO, token);
    }

    @Override
    @Transactional
    public void actualizarUltimoAcceso(Integer idUsuario) {
        usuarioRepository.actualizarUltimoAcceso(idUsuario, LocalDateTime.now());
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioEstadisticasDTO obtenerEstadisticas() {
        long total = usuarioRepository.count();
        long activos = usuarioRepository.countByActivoTrue();
        long inactivos = total - activos;
        long totalRoles = rolRepository.count();

        return new UsuarioEstadisticasDTO(total, activos, inactivos, totalRoles);
    }

    /**
     * Genera un token simulado (en producción usar JWT)
     */
    private String generarToken(Usuario usuario) {
        String data = usuario.getIdUsuario() + ":" + System.currentTimeMillis();
        return Base64.getEncoder().encodeToString(data.getBytes());
    }

    /**
     * Convierte una entidad Usuario a DTO
     * ⭐ IMPORTANTE: Convierte el nombre del rol ENUM al formato legible
     */
    private UsuarioResponseDTO convertirADTO(Usuario usuario) {
        String fotoBase64 = null;

        if (usuario.getFotoPerfil() != null && usuario.getFotoPerfil().length > 0) {
            try {
                // Validar si es imagen real
                if (ImagenUtils.esImagenValida(usuario.getFotoPerfil())) {
                    fotoBase64 = Base64.getEncoder().encodeToString(usuario.getFotoPerfil());
                }
                // Si NO es una imagen válida, fotoBase64 queda en null
            } catch (Exception e) {
                // Cualquier error → dejamos fotoBase64 como null
                fotoBase64 = null;
            }
        }

        return new UsuarioResponseDTO(
                usuario.getIdUsuario(),
                usuario.getRol().getIdRol(),
                convertirNombreRolEnumALegible(usuario.getRol().getNombreRol()),
                usuario.getPrimerNombre(),
                usuario.getSegundoNombre(),
                usuario.getApellidoPaterno(),
                usuario.getApellidoMaterno(),
                usuario.getNombreCompleto(),
                usuario.getEmail(),
                usuario.getUsername(),
                fotoBase64,
                usuario.getActivo(),
                usuario.getFechaCreacion(),
                usuario.getUltimoAcceso()
        );
    }

    /**
     * ⭐ NUEVO MÉTODO: Convierte nombres ENUM de la BD a formato legible
     *
     * Base de Datos (ENUM) → Frontend (Legible)
     * ADMINISTRADOR        → Administrador
     * CO_ADMINISTRADOR     → Co-Administrador
     * GESTOR_PEDIDOS       → Gestor de Pedidos
     * PROFESOR_A_CARGO     → Profesor a Cargo
     * ENCARGADO_BODEGA     → Encargado de Bodega
     * ASISTENTE_BODEGA     → Asistente de Bodega
     */
    private String convertirNombreRolEnumALegible(String nombreEnum) {
        switch (nombreEnum.toUpperCase()) {
            case "ADMINISTRADOR":
                return "Administrador";
            case "CO_ADMINISTRADOR":
                return "Co-Administrador";
            case "GESTOR_PEDIDOS":
                return "Gestor de Pedidos";
            case "PROFESOR_A_CARGO":
                return "Profesor a Cargo";
            case "DOCENTE":
                return "Docente";
            case "ENCARGADO_BODEGA":
                return "Encargado de Bodega";
            case "ASISTENTE_BODEGA":
                return "Asistente de Bodega";
            default:
                return nombreEnum; // Devolver tal cual si no coincide
        }
    }
}