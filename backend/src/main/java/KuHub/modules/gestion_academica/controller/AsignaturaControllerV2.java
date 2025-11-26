package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.assemblers.AsignaturaModelAssembler;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseCreateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourseUpdateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.CourserAnswerDTGOD;
import KuHub.modules.gestion_academica.entity.Asignatura;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.sevice.AsignaturaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.MediaTypes;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/v2/asignatura")
@Tag(name = "Gestión de Asignaturas HATEOAS", description = "Gestión completa de asignaturas y cursos con hypermedia links")
public class AsignaturaControllerV2 {

    @Autowired
    private AsignaturaService asignaturaService;

    @Autowired
    private AsignaturaModelAssembler asignaturaModelAssembler;

    @GetMapping("/find-by-id/{id}")
    @Operation(
            summary = "Obtener asignatura por ID",
            description = "Retorna los datos completos de una asignatura específica según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Asignatura encontrada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = CourserAnswerDTGOD.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Asignatura no encontrada"
            )
    })
    public ResponseEntity<EntityModel<CourserAnswerDTGOD>> findById(
            @Parameter(description = "ID de la asignatura", required = true)
            @PathVariable Integer id) {
        
        Asignatura asignatura = asignaturaService.findById(id);
        // Convertir a CourserAnswerDTGOD si es necesario
        CourserAnswerDTGOD courseDTO = convertToDTO(asignatura);
        EntityModel<CourserAnswerDTGOD> entityModel = asignaturaModelAssembler.toModel(courseDTO);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/find-all/")
    @Operation(
            summary = "Obtener todas las asignaturas",
            description = "Retorna lista completa de todas las asignaturas del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de asignaturas obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Asignatura.class)
                    )
            )
    })
    public ResponseEntity<List<Asignatura>> findAll() {
        return ResponseEntity.ok(asignaturaService.findAll());
    }

    @GetMapping("/find-all-courses-active-true/")
    @Operation(
            summary = "Obtener cursos activos con secciones",
            description = "Retorna únicamente los cursos activos con sus secciones asociadas"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de cursos activos obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = CourserAnswerDTGOD.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<CourserAnswerDTGOD>>> findAllCoursesActiveTrue() {
        List<EntityModel<CourserAnswerDTGOD>> courses = asignaturaService.findAllCourserActiveTrueWithSeccion()
                .stream()
                .map(asignaturaModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<CourserAnswerDTGOD>> collectionModel = CollectionModel.of(
                courses,
                linkTo(methodOn(AsignaturaControllerV2.class).findAllCoursesActiveTrue()).withSelfRel(),
                linkTo(methodOn(AsignaturaControllerV2.class).findAll()).withRel("todas-asignaturas")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @PostMapping("/create-asignatura/")
    @Operation(
            summary = "Crear nueva asignatura",
            description = "Registra una nueva asignatura en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Asignatura creada exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Asignatura.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "La asignatura ya existe"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos de la asignatura a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = Asignatura.class)
            )
    )
    public ResponseEntity<Asignatura> save(@Valid @RequestBody Asignatura asignatura) {
        return ResponseEntity.status(HttpStatus.CREATED).body(asignaturaService.save(asignatura));
    }

    @PostMapping("/create-course/")
    @Operation(
            summary = "Crear nuevo curso completo",
            description = "Registra un nuevo curso con toda su información"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Curso creado exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = CourseCreateDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos del curso a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = CourseCreateDTO.class)
            )
    )
    public ResponseEntity<CourseCreateDTO> createCourse(@Valid @RequestBody CourseCreateDTO courseCreateDTO) {
        return ResponseEntity.ok(asignaturaService.createCourse(courseCreateDTO));
    }

    @PutMapping("/update-course/")
    @Operation(
            summary = "Actualizar curso",
            description = "Actualiza los datos de un curso existente"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Curso actualizado exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = CourseUpdateDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Curso no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos actualizados del curso",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = CourseUpdateDTO.class)
            )
    )
    public ResponseEntity<CourseUpdateDTO> updateCourse(@Valid @RequestBody CourseUpdateDTO courseUpdateDTO) {
        return ResponseEntity.ok(asignaturaService.updateCourser(courseUpdateDTO));
    }

    @PutMapping("/soft-delete-course/{id}")
    @Operation(
            summary = "Eliminar curso (soft delete)",
            description = "Desactiva un curso sin eliminarlo físicamente de la base de datos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Curso eliminado exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Curso no encontrado"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Error al eliminar el curso"
            )
    })
    public ResponseEntity<?> softDeleteCourse(
            @Parameter(description = "ID del curso a eliminar", required = true)
            @PathVariable Integer id) {
        try {
            asignaturaService.softDeleteCourse(id);
            return ResponseEntity.noContent().build();
        } catch (GestionAcademicaException e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno al intentar eliminar el curso: " + e.getMessage());
        }
    }

    // Método auxiliar para convertir Asignatura a CourserAnswerDTGOD
    private CourserAnswerDTGOD convertToDTO(Asignatura asignatura) {
        CourserAnswerDTGOD dto = new CourserAnswerDTGOD();
        dto.setIdAsignatura(asignatura.getIdAsignatura());
        dto.setCodAsignatura(asignatura.getCodAsignatura());
        dto.setNombreAsignatura(asignatura.getNombreAsignatura());
        dto.setDescripcionAsignatura(asignatura.getDescripcion());
        // Completar con información del profesor si está disponible
        return dto;
    }
}