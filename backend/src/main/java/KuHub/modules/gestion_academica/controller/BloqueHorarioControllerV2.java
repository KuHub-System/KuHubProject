package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.assemblers.BloqueHorarioModelAssembler;
import KuHub.modules.gestion_academica.dtos.dtomodel.FilterTimeBlockRequestDTO;
import KuHub.modules.gestion_academica.entity.BloqueHorario;
import KuHub.modules.gestion_academica.sevice.BloqueHorarioService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/v2/bloque-horario")
@Tag(name = "Gestión de Bloques Horarios HATEOAS", description = "Gestión completa de bloques horarios con hypermedia links")
public class BloqueHorarioControllerV2 {

    @Autowired
    private BloqueHorarioService bloqueHorarioService;

    @Autowired
    private BloqueHorarioModelAssembler bloqueHorarioModelAssembler;

    @GetMapping("/find-by-id/{id}")
    @Operation(
            summary = "Obtener bloque horario por ID",
            description = "Retorna los datos de un bloque horario específico según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Bloque horario encontrado exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = BloqueHorario.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Bloque horario no encontrado"
            )
    })
    public ResponseEntity<EntityModel<BloqueHorario>> findById(
            @Parameter(description = "ID del bloque horario", required = true)
            @PathVariable Integer id) {
        
        BloqueHorario bloqueHorario = bloqueHorarioService.findById(id);
        EntityModel<BloqueHorario> entityModel = bloqueHorarioModelAssembler.toModel(bloqueHorario);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/find-all")
    @Operation(
            summary = "Obtener todos los bloques horarios",
            description = "Retorna lista completa de todos los bloques horarios del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de bloques horarios obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = BloqueHorario.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<BloqueHorario>>> findAll() {
        List<EntityModel<BloqueHorario>> bloques = bloqueHorarioService.findAll()
                .stream()
                .map(bloqueHorarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<BloqueHorario>> collectionModel = CollectionModel.of(
                bloques,
                linkTo(methodOn(BloqueHorarioControllerV2.class).findAll()).withSelfRel()
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/filter-by-numbers-blocks/{numbersBlocksFilter}")
    @Operation(
            summary = "Filtrar bloques por números",
            description = "Retorna bloques horarios que coincidan con los números especificados"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Bloques filtrados exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = BloqueHorario.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<BloqueHorario>>> filterBlocksByNumbersBlocks(
            @Parameter(description = "Lista de números de bloques a filtrar", required = true, 
                      example = "1,2,3")
            @PathVariable List<Integer> numbersBlocksFilter) {
        
        List<EntityModel<BloqueHorario>> bloques = bloqueHorarioService.filterBlocksByNumbersBlocks(numbersBlocksFilter)
                .stream()
                .map(bloqueHorarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<BloqueHorario>> collectionModel = CollectionModel.of(
                bloques,
                linkTo(methodOn(BloqueHorarioControllerV2.class).filterBlocksByNumbersBlocks(numbersBlocksFilter)).withSelfRel(),
                linkTo(methodOn(BloqueHorarioControllerV2.class).findAll()).withRel("todos-bloques")
        );

        return ResponseEntity.ok(collectionModel);
    }

    @PostMapping("/filter-by-day-week-and-id-room/")
    @Operation(
            summary = "Filtrar bloques por día y sala",
            description = "Retorna bloques horarios disponibles según día de la semana y sala específica"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Bloques filtrados exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = BloqueHorario.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos de filtro inválidos"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Filtros para buscar bloques horarios",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = FilterTimeBlockRequestDTO.class)
            )
    )
    public ResponseEntity<CollectionModel<EntityModel<BloqueHorario>>> filterBlocksDayWeekAndIdRoom(
            @Valid @RequestBody FilterTimeBlockRequestDTO filterTimeBlockRequestDTO) {
        
        List<EntityModel<BloqueHorario>> bloques = bloqueHorarioService.filterBlocksByDayWeekAndIdRoom(filterTimeBlockRequestDTO)
                .stream()
                .map(bloqueHorarioModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<BloqueHorario>> collectionModel = CollectionModel.of(
                bloques,
                linkTo(methodOn(BloqueHorarioControllerV2.class).filterBlocksDayWeekAndIdRoom(filterTimeBlockRequestDTO)).withSelfRel(),
                linkTo(methodOn(BloqueHorarioControllerV2.class).findAll()).withRel("todos-bloques")
        );

        return ResponseEntity.ok(collectionModel);
    }
}