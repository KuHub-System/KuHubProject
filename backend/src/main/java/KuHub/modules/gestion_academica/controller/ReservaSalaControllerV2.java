package KuHub.modules.gestion_academica.controller;

import KuHub.modules.gestion_academica.assemblers.ReservaSalaModelAssembler;
import KuHub.modules.gestion_academica.dtos.dtoentity.ReservaSalaEntityResponseDTO;
import KuHub.modules.gestion_academica.entity.ReservaSala;
import KuHub.modules.gestion_academica.sevice.ReservaSalaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/api/v2/reserva-sala")
@Tag(name = "Gestión de Reservas de Salas HATEOAS", description = "Gestión completa de reservas de salas con hypermedia links")
public class ReservaSalaControllerV2 {

    @Autowired
    private ReservaSalaService reservaSalaService;

    @Autowired
    private ReservaSalaModelAssembler reservaSalaModelAssembler;

    @GetMapping("/find-by-id/{id}")
    @Operation(
            summary = "Obtener reserva por ID",
            description = "Retorna los datos de una reserva de sala específica según su identificador"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Reserva encontrada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = ReservaSalaEntityResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Reserva no encontrada"
            )
    })
    public ResponseEntity<EntityModel<ReservaSalaEntityResponseDTO>> findById(
            @Parameter(description = "ID de la reserva", required = true)
            @PathVariable Integer id) {
        
        ReservaSalaEntityResponseDTO reserva = reservaSalaService.findById(id);
        EntityModel<ReservaSalaEntityResponseDTO> entityModel = reservaSalaModelAssembler.toModel(reserva);
        
        return ResponseEntity.ok(entityModel);
    }

    @GetMapping("/find-all/")
    @Operation(
            summary = "Obtener todas las reservas",
            description = "Retorna lista completa de todas las reservas de salas del sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de reservas obtenida exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = ReservaSalaEntityResponseDTO.class)
                    )
            )
    })
    public ResponseEntity<CollectionModel<EntityModel<ReservaSalaEntityResponseDTO>>> findAll() {
        List<EntityModel<ReservaSalaEntityResponseDTO>> reservas = reservaSalaService.findAll()
                .stream()
                .map(reservaSalaModelAssembler::toModel)
                .toList();

        CollectionModel<EntityModel<ReservaSalaEntityResponseDTO>> collectionModel = CollectionModel.of(
                reservas,
                linkTo(methodOn(ReservaSalaControllerV2.class).findAll()).withSelfRel()
        );

        return ResponseEntity.ok(collectionModel);
    }

    @GetMapping("/find-reserved-blocks-ids")
    @Operation(
            summary = "Obtener IDs de bloques reservados",
            description = "Retorna lista de IDs de bloques horarios reservados para una sala y día específicos"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de IDs obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Integer.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Parámetros inválidos"
            )
    })
    public ResponseEntity<List<Integer>> findReservedBlocksIds(
            @Parameter(description = "ID de la sala", required = true)
            @RequestParam Integer idSala,
            @Parameter(description = "Día de la semana", required = true, 
                      example = "LUNES")
            @RequestParam String diaSemana) {
        
        return ResponseEntity.ok(reservaSalaService.findReservedBlocksByIdSalaAndDayWeek(idSala, diaSemana));
    }

    @PostMapping("/create-reserva-sala/")
    @Operation(
            summary = "Crear nueva reserva",
            description = "Registra una nueva reserva de sala en el sistema"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Reserva creada exitosamente",
                    content = @Content(
                            mediaType = MediaTypes.HAL_JSON_VALUE,
                            schema = @Schema(implementation = ReservaSalaEntityResponseDTO.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Datos inválidos en la solicitud"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Conflicto: el bloque ya está reservado"
            )
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Datos de la reserva a crear",
            content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ReservaSala.class)
            )
    )
    public ResponseEntity<EntityModel<ReservaSalaEntityResponseDTO>> save(@RequestBody ReservaSala reservaSala) {
        ReservaSalaEntityResponseDTO nuevaReserva = reservaSalaService.save(reservaSala);
        EntityModel<ReservaSalaEntityResponseDTO> entityModel = reservaSalaModelAssembler.toModel(nuevaReserva);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(entityModel);
    }
}