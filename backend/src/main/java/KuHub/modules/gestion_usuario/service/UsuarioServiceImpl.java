package KuHub.modules.gestion_usuario.service;

import KuHub.modules.gestion_usuario.dtos.*;
import KuHub.modules.gestion_usuario.dtos.proyection.UserIdNameView;
import KuHub.modules.gestion_usuario.dtos.record.UserIdNameDTO;
import KuHub.modules.gestion_usuario.entity.Rol;
import KuHub.modules.gestion_usuario.entity.Usuario;
import KuHub.modules.gestion_usuario.exceptions.*;
import KuHub.modules.gestion_usuario.repository.RolRepository;
import KuHub.modules.gestion_usuario.repository.UsuarioRepository;
import KuHub.utils.ImagenUtils;
import KuHub.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder; // ⚠️ NUEVO IMPORT
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;


/**
 * Implementación del servicio de Usuarios
 * ⚠️ MODIFICADO: Agregado BCrypt para hashear contraseñas
 */
@Service
public class UsuarioServiceImpl implements UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    // ⚠️ NUEVO: Inyectamos el PasswordEncoder (BCrypt)
    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Obtiene el ID y Nombre del usuario actualmente logueado (desde el Token)
     * Úsalo cuando necesites guardar quién hizo algo.
     */
    @Override
    @Transactional(readOnly = true)
    public UserIdNameDTO getUsuarioConectado() {
        // 1. Obtener email del Token actual
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();

        // 2. Buscar datos crudos (View)
        // Asegúrate de haber agregado el método 'findViewByEmail' en tu Repository
        UserIdNameView rawData = usuarioRepository.findViewByEmail(email)
                .orElseThrow(() -> new RuntimeException("Error: El usuario del token no existe en la BBDD"));

        // 3. Retornar el Record limpio
        return UserIdNameDTO.crearDesdeDatos(
                rawData.getIdUsuario(),
                rawData.getPrimerNombre(),
                rawData.getSegundoNombre(),
                rawData.getApellidoPaterno(),
                rawData.getApellidoMaterno()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Integer buscarIdPorUsername(String identifier) {
        // 1. Intentamos buscar por el campo 'username'
        Usuario usuario = usuarioRepository.findByUsername(identifier).orElse(null);

        // 2. Si no lo encontramos, intentamos por 'email' (por si el token trae el email)
        if (usuario == null) {
            usuario = usuarioRepository.findByEmailIgnoreCase(identifier)
                    .orElseThrow(() -> new UsuarioNotFoundException("username/email", identifier));
        }

        return usuario.getIdUsuario();
    }

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
    public String obtenerNombreCompleto(UsuarioResponseDTO dto){
        return StringUtils.capitalizarPalabras(Stream.of(
                        dto.getPrimerNombre(),
                        dto.getSegundoNombre(),
                        dto.getApellidoPaterno(),
                        dto.getApellidoMaterno()
                )
                .filter(s -> s != null && !s.isBlank())  // elimina null y vacíos
                .collect(Collectors.joining(" ")));
    }

    @Override
    public String formatearNombreCompleto(Usuario u) {
        return StringUtils.capitalizarPalabras(Stream.of(
                        u.getPrimerNombre(),
                        u.getSegundoNombre(),
                        u.getApellidoPaterno(),
                        u.getApellidoMaterno()
                )
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(" ")));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserIdAndCompleteNameDTO> obtenerDocentesYProfesoresActivos() {
        return usuarioRepository.findAll().stream()
                .filter(u ->
                        Boolean.TRUE.equals(u.getActivo()) &&
                                (
                                        "DOCENTE".equalsIgnoreCase(u.getRol().getNombreRol()) ||
                                                "PROFESOR_A_CARGO".equalsIgnoreCase(u.getRol().getNombreRol())
                                )
                )
                .map(u -> new UserIdAndCompleteNameDTO(
                        u.getIdUsuario(),
                        formatearNombreCompleto(u)
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserIdAndCompleteNameDTO> obtenerTodosProfesorACargo(){
        List<Usuario> profesoreACargo = usuarioRepository.findAllByRol_IdRol(4);

        List<UserIdAndCompleteNameDTO> profes = new ArrayList<>();
        for (Usuario pc : profesoreACargo) {
            if( pc.getActivo()){
                profes.add (new UserIdAndCompleteNameDTO(
                        pc.getIdUsuario(),
                        formatearNombreCompleto(pc)
                ));
            }


        }
        return profes;
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
    public Usuario obtenerPorIdEntidad(Integer idUsuario){
        return usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNotFoundException(idUsuario));
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
    @Transactional(readOnly = true)
    public Boolean existeUsuarioActivo (Integer id){
        return usuarioRepository.existsUsuarioByIdUsuarioAndActivoTrue(id);
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

        // ⚠️ MODIFICADO: Hashear la contraseña con BCrypt
        String contrasenaHasheada = passwordEncoder.encode(usuarioRequestDTO.getContrasena());
        usuario.setContrasena(contrasenaHasheada);

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

        // ⚠️ MODIFICADO: Actualizar contraseña con BCrypt si se proporciona
        if (usuarioUpdateDTO.getContrasena() != null && !usuarioUpdateDTO.getContrasena().trim().isEmpty()) {
            String contrasenaHasheada = passwordEncoder.encode(usuarioUpdateDTO.getContrasena());
            usuario.setContrasena(contrasenaHasheada);
        }

        // Actualizar foto de perfil si se proporciona
        if (usuarioUpdateDTO.getFotoPerfil() != null && !usuarioUpdateDTO.getFotoPerfil().isEmpty()) {
            try {
                byte[] fotoBytes = Base64.getDecoder().decode(usuarioUpdateDTO.getFotoPerfil());

                if (fotoBytes.length > 10 * 1024 * 1024) {
                    usuario.setFotoPerfil(null);
                } else {
                    usuario.setFotoPerfil(fotoBytes);
                }

            } catch (IllegalArgumentException e) {
                usuario.setFotoPerfil(null);
            }
        }

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
    @Transactional // Importante para asegurar la operación en BDD
    public void cambiarContrasena(Integer idUsuario, String passwordActual, String nuevaPassword, String confirmacionPassword) {

        // 1. Validar que la nueva contraseña y la confirmación coinciden
        if (!nuevaPassword.equals(confirmacionPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las contraseñas nuevas no coinciden");
        }

        // 2. Buscar al usuario en la BDD
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        // 3. Validar que la contraseña ACTUAL ingresada sea correcta
        // passwordEncoder.matches(textoPlano, hashGuardado)
        if (!passwordEncoder.matches(passwordActual, usuario.getContrasena())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta");
        }

        // 4. Encriptar la nueva contraseña
        String passwordEncriptada = passwordEncoder.encode(nuevaPassword);

        // 5. Actualizar y guardar
        usuario.setContrasena(passwordEncriptada);
        usuarioRepository.save(usuario);
    }

    @Override
    @Transactional
    public UsuarioResponseDTO actualizarFotoPerfil(MultipartFile foto) {
        // 1. Obtener el identificador (email/username) directamente del token
        String identificador = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();

        // 2. Buscar al usuario usando el método flexible findByIdentificador que ya creamos
        Usuario usuario = usuarioRepository.findByIdentificador(identificador)
                .orElseThrow(() -> new RuntimeException("Usuario del token no encontrado: " + identificador));

        if (foto != null && !foto.isEmpty()) {
            try {
                byte[] fotoBytes = foto.getBytes();

                // Validar tamaño máximo 10MB
                if (fotoBytes.length > 10 * 1024 * 1024) {
                    throw new IllegalArgumentException("La foto no puede superar 10MB");
                }

                // Validar tipo de archivo
                if (!ImagenUtils.esImagenValida(fotoBytes)) {
                    throw new IllegalArgumentException("El archivo no es una imagen válida (JPG/PNG).");
                }

                usuario.setFotoPerfil(fotoBytes);

            } catch (IOException e) {
                throw new RuntimeException("Error al procesar la imagen", e);
            }
        }

        Usuario usuarioActualizado = usuarioRepository.save(usuario);
        return convertirADTO(usuarioActualizado);
    }

    // ⚠️ MÉTODO login() ELIMINADO
    // Ya no es necesario porque el login lo maneja JwtAuthenticationFilter
    // Si intentas usar este método, Spring Security NO lo usará
    // El login ahora se hace automáticamente mediante POST /login con los filtros JWT

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO loginRequestDTO) {
        // ⚠️ ESTE MÉTODO YA NO SE USA CON JWT
        // El login lo manejan los filtros:
        // - JwtAuthenticationFilter: procesa el login
        // - JpaUserDetailsService: valida las credenciales

        // Sin embargo, lo dejamos aquí por si lo usas en alguna prueba
        // pero en producción, este método NO se ejecutará

        throw new UnsupportedOperationException(
                "El login ahora se maneja mediante JWT. " +
                        "Usa POST /login con { \"email\": \"...\", \"contrasena\": \"...\" }"
        );
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
     * ⚠️ MÉTODO generarToken() ELIMINADO
     * Ya no se necesita porque el token JWT lo genera JwtAuthenticationFilter
     */

    /**
     * Convierte una entidad Usuario a DTO
     * ⭐ IMPORTANTE: Convierte el nombre del rol ENUM al formato legible
     */
    @Override
    public UsuarioResponseDTO convertirADTO(Usuario usuario) {
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