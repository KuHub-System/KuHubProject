package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.assemblers.SalaModelAssembler;
import KuHub.modules.gestion_academica.entity.Sala;
import KuHub.modules.gestion_academica.exceptions.GestionAcademicaException;
import KuHub.modules.gestion_academica.service.SalaService;
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
@RequestMapping("/api/v2/sala")
@Tag(name = "Gestión de Salas HATEOAS", description = "Gestión completa de salas con hypermedia links")
public class SalaControllerV2 {

    @Autowired
    private SalaService salaService;

    @Autowired
    private SalaModelAssembler salaModelAssembler;

    @GetMapping("/find-by-id/{id}")
    @Operation(
            summary = "Obtener sala por ID",
            description = "Retorna los datos de una sala específica según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Sala encontrada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Sala.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Sala no encontrada"
            )
    })
    public ResponseEntity<EntityModel<Sala>> findById(
            @Parameter(description = "ID de la sala", required = true)
            @PathVariable Integer id) {
        
        Sala sala = salaService.findById(id);
        EntityModel<Sala> entityModel = salaModelAssembler.toModel(sala);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/find-all/")
    @Operation(
            summary = "Obtener todas las salas",
            description = "Retorna lista completa de todas las salas del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de salas obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Sala.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<Sala>>> findAll() {
        List<EntityModel<Sala>> salas = salaService.findAll()
                .stream()
                .map(salaModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<Sala>> collectionModel = CollectionModel.of(
                salas,
                linkTo(methodOn(SalaControllerV2.class).findAll()).withSelfRel(),
                linkTo(methodOn(SalaControllerV2.class).findAllActiveRoomsTrue()).withRel("salas-activas")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/find-all-active-rooms-true/")
    @Operation(
            summary = "Obtener salas activas",
            description = "Retorna únicamente las salas con estado activo"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de salas activas obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Sala.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<Sala>>> findAllActiveRoomsTrue() {
        List<EntityModel<Sala>> salas = salaService.findAllActiveRoomsTrue()
                .stream()
                .map(salaModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<Sala>> collectionModel = CollectionModel.of(
                salas,
                linkTo(methodOn(SalaControllerV2.class).findAllActiveRoomsTrue()).withSelfRel(),
                linkTo(methodOn(SalaControllerV2.class).findAll()).withRel("todas-salas")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @PostMapping("/create-sala/")
    @Operation(
            summary = "Crear nueva sala",
            description = "Registra una nueva sala en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Sala creada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = Sala.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "La sala ya existe"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos de la sala a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = Sala.class)
            )
    )
    public ResponseEntity<EntityModel<Sala>> save(@Valid @RequestBody Sala sala) {
        Sala nuevaSala = salaService.save(sala);
        EntityModel<Sala> entityModel = salaModelAssembler.toModel(nuevaSala);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(entityModel);
    }

    @PutMapping("/soft-delete/{id}")
    @Operation(
            summary = "Eliminar sala (soft delete)",
            description = "Desactiva una sala sin eliminarla físicamente de la base de datos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "204",
                    description = "Sala eliminada exitosamente"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Sala no encontrada"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Error al eliminar la sala"
            )
    })
    public ResponseEntity<?> softDelete(
            @Parameter(description = "ID de la sala a eliminar", required = true)
            @PathVariable Integer id) {
        try {
            salaService.softDelete(id);
            return ResponseEntity.noContent().build();
        } catch (GestionAcademicaException e) {
            return ResponseEntity.status(400).body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error interno al intentar eliminar la sala: " + e.getMessage());
        }
    }
}