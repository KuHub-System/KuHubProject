# KuHub — Revisión de Controladores y Patrones de Implementación

Revisa todos los controladores del proyecto KuHub y extrae los patrones de implementación reutilizables para que pueda replicarlos en nuevos endpoints.

## Qué hacer

1. Lee estos archivos en paralelo:
   - `backend/src/main/java/KuHub/modules/gestion_solicitud/controller/SolicitudController.java`
   - `backend/src/main/java/KuHub/modules/gestion_pedido/controller/PedidoController.java`
   - `backend/src/main/java/KuHub/modules/gestion_usuario/controller/UsuarioControllerV2.java`
   - `backend/src/main/java/KuHub/modules/gestion_inventario/controller/ProductoControllerV2.java`
   - `backend/src/main/java/KuHub/modules/gestion_academica/controller/SemanaController.java`

2. Para cada patrón encontrado, muestra:
   - El método HTTP usado (GET / POST / PATCH / PUT / DELETE)
   - El tipo de retorno (`ResponseEntity<Boolean>`, `ResponseEntity<List<...>>`, etc.)
   - Cómo se valida el body (`@Validated`, `@Valid`, `@RequestBody`)
   - Cómo se retorna la respuesta (`ResponseEntity.status(200).body(...)`, `.noContent()`, `.created(...)`)
   - Si usa `@Transactional` en el servicio
   - Cómo el repositorio ejecuta la consulta (nativa con `@Query`, `@Modifying`, Spring Data)

3. Muestra también los patrones del repositorio:
   - Consultas nativas con `json_agg` / `json_build_object` (retornan `String` → se deserializa con `ObjectMapper`)
   - `@Modifying` para UPDATE/DELETE masivos (retornan `int` = filas afectadas)
   - Proyecciones (`List<Object[]>` → mapeadas manualmente en el servicio)

4. Finalmente, genera un **template de implementación** para un nuevo módulo siguiendo exactamente los patrones del proyecto:

```
CONTROLADOR:
@PatchMapping("/change-massive-status")
public ResponseEntity<Boolean> changeMassiveStatus(
        @Validated @RequestBody NuevoDTO request) {
    return ResponseEntity.status(200).body(service.cambiarEstado(request));
}

REPOSITORIO (@Modifying):
@Modifying
@Query(value = "UPDATE tabla SET columna = CAST(:valor AS tipo_enum) WHERE id IN (:ids)", nativeQuery = true)
int updateMasivo(@Param("ids") List<Integer> ids, @Param("valor") String valor);

SERVICIO (implementación):
@Transactional
@Override
public boolean cambiarEstado(NuevoDTO request) {
    int filas = repository.updateMasivo(request.ids(), request.valor());
    return filas > 0;
}

DTO (record):
public record NuevoDTO(
    @NotEmpty List<@NotNull Integer> ids,
    @NotNull String valor
) {}
```

5. Si el usuario pide implementar algo concreto después de revisar, aplica el patrón correspondiente.
