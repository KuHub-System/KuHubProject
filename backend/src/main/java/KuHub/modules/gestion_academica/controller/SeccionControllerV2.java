package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.assemblers.SeccionModelAssembler;
import KuHub.modules.gestion_academica.dtos.dtoentity.SeccionEntityResponseDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.SectionAnswerUpdateDTO;
import KuHub.modules.gestion_academica.dtos.dtomodel.SectionCreateDTO;
import KuHub.modules.gestion_academica.entity.Seccion;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.SeccionService;
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
@RequestMapping("/api/v2/seccion")
@Tag(name = "Gestión de Secciones HATEOAS", description = "Gestión completa de secciones con hypermedia links")
public class SeccionControllerV2 {

    @Autowired
    private SeccionService seccionService;

    @Autowired
    private SeccionModelAssembler seccionModelAssembler;

    @GetMapping("/find-by-id/{id}")
    @Operation(
            summary = "Obtener sección por ID",
            description = "Retorna los datos de una sección específica según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Sección encontrada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = SeccionEntityResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Sección no encontrada"
            )
    })
    public ResponseEntity<EntityModel<SeccionEntityResponseDTO>> findById(
            @Parameter(description = "ID de la sección", required = true)
            @PathVariable Integer id) {
        
        SeccionEntityResponseDTO seccion = seccionService.findById(id);
        EntityModel<SeccionEntityResponseDTO> entityModel = seccionModelAssembler.toModel(seccion);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/find-by-id-and-seccion-active-is-true/{id}")
    @Operation(
            summary = "Obtener sección activa por ID",
            description = "Retorna los datos de una sección específica solo si está activa"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Sección activa encontrada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = SeccionEntityResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Sección no encontrada o no está activa"
            )
    })
    public ResponseEntity<EntityModel<SeccionEntityResponseDTO>> findByIdAndSeccionActiveIsTrue(
            @Parameter(description = "ID de la sección", required = true)
            @PathVariable Integer id) {
        
        SeccionEntityResponseDTO seccion = seccionService.findByIdAndActiveIsTrueResponseDTO(id);
        EntityModel<SeccionEntityResponseDTO> entityModel = seccionModelAssembler.toModel(seccion);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/find-all/")
    @Operation(
            summary = "Obtener todas las secciones",
            description = "Retorna lista completa de todas las secciones del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de secciones obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = SeccionEntityResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<SeccionEntityResponseDTO>>> findAll() {
        List<EntityModel<SeccionEntityResponseDTO>> secciones = seccionService.findAll()
                .stream()
                .map(seccionModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<SeccionEntityResponseDTO>> collectionModel = CollectionModel.of(
                secciones,
                linkTo(methodOn(SeccionControllerV2.class).findAll()).withSelfRel(),
                linkTo(methodOn(SeccionControllerV2.class).findAllByActivoTrue()).withRel("secciones-activas")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/find-all-by-activo-true/")
    @Operation(
            summary = "Obtener secciones activas",
            description = "Retorna únicamente las secciones con estado activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de secciones activas obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = SeccionEntityResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<SeccionEntityResponseDTO>>> findAllByActivoTrue() {
        List<EntityModel<SeccionEntityResponseDTO>> secciones = seccionService.findAllByActivoTrue()
                .stream()
                .map(seccionModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<SeccionEntityResponseDTO>> collectionModel = CollectionModel.of(
                secciones,
                linkTo(methodOn(SeccionControllerV2.class).findAllByActivoTrue()).withSelfRel(),
                linkTo(methodOn(SeccionControllerV2.class).findAll()).withRel("todas-secciones")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @PostMapping("/create-seccion/")
    @Operation(
            summary = "Crear nueva sección",
            description = "Registra una nueva sección en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Sección creada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = SeccionEntityResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos de la sección a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = Seccion.class)
            )
    )
    public ResponseEntity<EntityModel<SeccionEntityResponseDTO>> save(@Valid @RequestBody Seccion seccion) {
        SeccionEntityResponseDTO nuevaSeccion = seccionService.save(seccion);
        EntityModel<SeccionEntityResponseDTO> entityModel = seccionModelAssembler.toModel(nuevaSeccion);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(entityModel);
    }

    @PostMapping("/create-seccion-frontend/")
    @Operation(
            summary = "Crear sección desde frontend",
            description = "Registra una nueva sección con datos del frontend incluyendo bloques horarios"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Sección creada exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = SectionAnswerUpdateDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos de la sección a crear desde frontend",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = SectionCreateDTO.class)
            )
    )
    public ResponseEntity<SectionAnswerUpdateDTO> createSectionFrontend(@Valid @RequestBody SectionCreateDTO sectionCreateDTO) {
        return ResponseEntity.ok(seccionService.createSection(sectionCreateDTO));
    }

    @PutMapping("/update-seccion-frontend/")
    @Operation(
            summary = "Actualizar sección desde frontend",
            description = "Actualiza los datos de una sección existente"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Sección actualizada exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = SectionAnswerUpdateDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Sección no encontrada"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos actualizados de la sección",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = SectionAnswerUpdateDTO.class)
            )
    )
    public ResponseEntity<SectionAnswerUpdateDTO> updateSectionFrontend(@Valid @RequestBody SectionAnswerUpdateDTO sectionAnswerUpdateDTO) {
        return ResponseEntity.ok(seccionService.updateSection(sectionAnswerUpdateDTO));
    }

    @PutMapping("/soft-delete/{id}")
    @Operation(
            summary = "Eliminar sección (soft delete)",
            description = "Desactiva una sección sin eliminarla físicamente de la base de datos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Sección eliminada exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Sección no encontrada"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Error al eliminar la sección"
            )
    })
    public ResponseEntity<?> softDelete(
            @Parameter(description = "ID de la sección a eliminar", required = true)
            @PathVariable Integer id) {
        try {
            seccionService.softDelete(id);
            return ResponseEntity.noContent().build();
        } catch (GestionAcademicaException e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno al intentar eliminar la sección: " + e.getMessage());
        }
    }
}