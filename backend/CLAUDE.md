# CLAUDE.md — Guía de implementación Backend KuHub

Este archivo define las convenciones obligatorias para **toda nueva implementación o cambio** en el backend.
Leerlo antes de crear cualquier clase, endpoint, DTO o lógica nueva.

---

## Estructura general del proyecto

```
backend/src/main/java/KuHub/
├── config/
│   └── security/          # SpringSecurityConfig, filtros, rate limiting
├── modules/               # Todos los módulos de negocio
│   └── <nombre_modulo>/   # Ej: gestion_inventario, gestion_usuario
│       ├── assemblers/
│       ├── controller/
│       ├── dtos/
│       │   ├── request/
│       │   └── response/
│       ├── entity/
│       ├── exceptions/
│       ├── repository/
│       └── services/
└── utils/                 # Utilidades globales (PaginationUtils, StringUtils, etc.)
```

---

## 1. Módulos (`modules/`)

Cada módulo agrupa entidades, lógica y capas relacionadas por dominio de negocio o de base de datos.

### 1.1 Dónde crear una nueva Entity

**SIEMPRE preguntar** en qué módulo va la nueva entity. Las entities se agrupan según su relación lógica (BD o frontend), no se crean módulos nuevos sin justificación. Módulos existentes:

| Módulo | Contenido principal |
|--------|-------------------|
| `gestion_inventario` | Inventario, Producto, Categoria, UnidadMedida, Movimiento |
| `gestion_usuario` | Usuario, roles, autenticación |
| `gestion_academica` | Lógica académica |
| `gestion_receta` | Recetas |
| `gestion_solicitud` | Solicitudes |
| `gestion_pedido` | Pedidos |
| `dashboard` | Consultas agregadas para dashboard |

### 1.2 Packages base dentro de cada módulo

Todo módulo debe tener estos packages internos:

```
controller/
dtos/
  request/
  response/
entity/
exceptions/
repository/
services/
assemblers/    (si aplica)
```

---

## 2. Controller

- Anotación: `@RestController`
- Ruta base: `/api/v1/<nombre-del-servicio>`
- Nombre de la clase: `<Servicio>Controller`
- Inyectar el service usando su nombre completo: `inventarioService`, `usuarioService`, etc.

### 2.1 Estructura estándar de endpoint

```java
@GetMapping("/filters")
public ResponseEntity<InventoryFilters> findFiltersInventory() {
    return ResponseEntity
            .status(200)
            .body(inventarioService.findFiltersInventory());
}
```

Reglas:
- Siempre indicar el status numéricamente (`.status(200)`, `.status(204)`, etc.)
- Llamar al service con su nombre completo
- Preferir `@PatchMapping` para actualizaciones parciales; usar `@PutMapping` solo cuando se reemplaza el recurso completo

### 2.2 Endpoints con múltiples status (manejo de excepciones de negocio)

Cuando el frontend necesita distinguir distintos comportamientos según el status de respuesta:

```java
@PatchMapping("/update-inventory-with-product")
public ResponseEntity<?> updateInventoryWithProduct(
        @Validated @RequestBody InventoryWithProductUpdateDTO request) {
    try {
        Object result = inventarioService.updateInventoryWithProduct(request);
        return ResponseEntity.status(200).body(result);
    } catch (StockDesincronizadoException ex) {
        StockSyncWarningDTO responseBody = new StockSyncWarningDTO(ex.getMessage(), ex.getInventoryItem());
        return ResponseEntity.status(ex.getStatus()).body(responseBody);
    } catch (StockInsuficienteException ex) {
        StockSyncWarningDTO responseBody = new StockSyncWarningDTO(ex.getMessage(), ex.getInventoryItem());
        return ResponseEntity.status(ex.getStatus()).body(responseBody);
    }
}
```

### 2.3 Eliminación lógica (soft delete)

- Usar `@DeleteMapping` aunque no elimine de BD
- Forzar siempre `status(204)` aunque retorne `boolean`

```java
@DeleteMapping("/soft-delete-inventory-with-product/{idInventario}")
public ResponseEntity<Boolean> softDeleteInventoryWithProduct(@PathVariable Integer idInventario) {
    return ResponseEntity
            .status(204)
            .body(inventarioService.softDeleteByInventoryWithProduct(idInventario));
}
```

### 2.4 Documentación de endpoints

Cada método del controller lleva JavaDoc indicando si está consumido por el frontend:

```java
/**
 * Actualiza un producto y ajusta su stock, manejando validaciones de sincronía.
 * ✅ En uso: Consumido por actualizarProductoService en inventario-service.ts.
 */
```

Si aún no está conectado al frontend: `⬜ Sin uso frontend aún.`

### 2.5 Seguridad — SpringSecurityConfig

**Toda ruta nueva debe registrarse en `SpringSecurityConfig`** con el rol correspondiente para evitar error 403.

---

## 3. DTOs (`dtos/`)

Los DTOs se dividen en `request/` y `response/`. Dentro de cada uno pueden existir sub-packages según la necesidad.

### 3.1 Cuándo usar cada tipo

| Tipo | Cuándo usarlo |
|------|--------------|
| **DTO** (clase) | Una sola clase de datos es suficiente para la lógica |
| **Proyección** (interfaz) | Métodos de repositorio que solo listan (GET) sin lógica compleja |
| **Record** | Lógica compleja con múltiples clases anidadas (paginación, respuestas compuestas) |

### 3.2 DTO de request

- Anotaciones Lombok: `@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor`
- Siempre usar anotaciones de validación (`@NotNull`, `@NotBlank`, `@DecimalMin`, `@Size`, etc.) para evitar `if`s de validación en el service
- Usar `@Validated` en el controller al recibir el DTO

```java
@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor
public class MotionCreateDTO {
    @NotNull(message = "El ID del inventario es obligatorio")
    private Integer idInventario;

    @DecimalMin(value = "0.001", message = "El movimiento debe ser mayor a 0")
    @Digits(integer = 7, fraction = 3, message = "Máximo 7 enteros y 3 decimales")
    private BigDecimal stockMovimiento;

    @NotBlank(message = "El tipo de movimiento es obligatorio")
    private String tipoMovimiento;

    @Size(max = 150, message = "La observación no puede exceder los 150 caracteres")
    private String observacion;
}
```

### 3.3 Proyección de response

- Es una interfaz con getters
- Nombre termina en `View` (ej: `ProductInventoryBulkView`)
- Usar `@JsonPropertyOrder` para controlar el orden de las llaves en el JSON

```java
@JsonPropertyOrder({"nombreProducto", "detalles", "stock", "esFraccionario", "idInventario", "idProducto"})
public interface ProductInventoryBulkView {
    String getNombreProducto();
    BigDecimal getStock();
    Boolean getEsFraccionario();
    Integer getIdInventario();
}
```

### 3.4 Record de response

Usar cuando la lógica es compleja y requiere múltiples clases anidadas (paginación, consultas nativas con `Object[]`, etc.).

```java
public record WarehousesPage(
        List<WarehouseItem> data,
        Integer page,
        Integer pageSize,
        Integer totalPaginas,
        Long totalRegistros
) {
    public record WarehouseItem(String nombreProducto, BigDecimal stock /* ... */) {
        public static WarehouseItem fromRow(Object[] row) { /* conversión segura */ }
    }

    public static WarehousesPage of(List<Object[]> rows, PaginationUtils.PagingResult paging, long total) {
        /* factory */ 
    }
}
```

- Los índices del `Object[]` deben coincidir exactamente con el `SELECT` nativo
- Implementar lógica de conversión dentro del record para aliviar el service
- Usar `((Number) row[n]).intValue()` y `new BigDecimal(row[n].toString())` para casteos seguros

---

## 4. Exceptions (`exceptions/`)

### 4.1 Exception del módulo

Cada módulo tiene su propia excepción base con `HttpStatus`:

```java
@Getter
public class GestionInventarioException extends RuntimeException {
    private final HttpStatus status;

    public GestionInventarioException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
```

### 4.2 GlobalExceptionHandler

Toda nueva excepción debe registrarse en `GlobalExceptionHandler` indicando el mensaje y status que devuelve al cliente.

---

## 5. Repository (`repository/`)

- Nombre: `<Entidad>Repository`
- Extiende: `JpaRepository<Entidad, TipoId>`
- Anotación: `@Repository`

### 5.1 Orden obligatorio dentro del repositorio

```
1. Métodos JPA derivados (findBy..., existsBy...) — solo una línea, van primero
2. @Query personalizados de solo lectura (SELECT)
3. @Modifying + @Transactional (UPDATE / INSERT directo en BD)
4. boolean de validación (existsBy...)
```

### 5.2 Documentación

Cada método lleva un JavaDoc de una línea describiendo qué hace:

```java
/** Busca un inventario activo con su producto por ID. */
@Query("SELECT i FROM Inventario i JOIN i.producto p WHERE p.activo = :activo AND i.idInventario = :idInventario")
Optional<Inventario> findByIdInventoryWithProductActive(@Param("idInventario") Integer idInventario, @Param("activo") Boolean activo);
```

### 5.3 Consultas nativas con Object[]

Documentar el índice de cada columna con comentarios en el SQL:

```java
@Query(value = """
    SELECT
        p.nombre_producto,   -- [0]
        i.stock,             -- [1]
        i.id_inventario      -- [2]
    FROM inventario i
    JOIN producto p ON p.id_producto = i.id_producto
    WHERE i.activo = TRUE
""", nativeQuery = true)
List<Object[]> findByIdToInventoryPage(@Param("idInventario") Integer idInventario);
```

---

## 6. Services (`services/`)

### 6.1 Estructura

Siempre una **interfaz** + **implementación**:

- Interfaz: `<Servicio>Service` — declara todos los métodos públicos
- Implementación: `<Servicio>ServiceImpl implements <Servicio>Service`

### 6.2 Anotaciones en ServiceImpl

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class InventarioServiceImpl implements InventarioService {
```

### 6.3 Inyección de dependencias con @Autowired

Siempre `@Autowired` (no inyección por constructor aunque `@RequiredArgsConstructor` esté presente). Mantener el orden y los comentarios de sección:

```java
/**Repositories*/
@Autowired
private InventarioRepository inventarioRepository;

/**Services*/
@Autowired
private CategoriaService categoriaService;

/**Others*/
@Autowired
private ObjectMapper objectMapper;
```

### 6.4 Llamadas a repositorios y services

Siempre con nombre completo: `inventarioRepository.findById(id)`, nunca abreviaturas.

### 6.5 Orden de métodos en el ServiceImpl

```
1. Métodos de búsqueda por ID (findById)
2. Métodos de listado / búsqueda paginada
3. Métodos de creación (save)
4. Métodos de actualización (update)
5. Métodos de eliminación lógica (softDelete)
6. ── Métodos privados al final ──
```

### 6.6 Updates — validar cambio antes de setear

En los métodos de update, siempre verificar si el valor cambió antes de hacer el set:

```java
if (!oldProducto.getNombreProducto().equals(nombreProducto)) {
    oldProducto.setNombreProducto(nombreProducto);
}
```

### 6.7 Eliminación lógica

- Se asigna `activo = false` en la entidad (nunca `delete` real en BD)
- El método se llama `softDeleteBy<Entidad>(...)` por convención

### 6.8 Transacciones

- Métodos de solo lectura: `@Transactional(readOnly = true)`
- Métodos que escriben: `@Transactional`
- Si el método no debe hacer rollback ante una excepción específica: `@Transactional(noRollbackFor = MiException.class)`

### 6.9 Logging

Usar `log.info(...)` y `log.warn(...)` del `@Slf4j` para registrar operaciones importantes (movimientos, desincronizaciones, cambios de stock):

```java
log.warn("Desincronización detectada. Stock en vista: {} | Stock real: {} | Producto: {}",
        request.getStockEnVista(), stockReal, oldInventario.getProducto().getNombreProducto());
```

---

## 7. Eliminación lógica — regla global

**Todo el sistema usa eliminación lógica** (`activo = false`). Nunca eliminar registros de la base de datos. En el controller se usa `@DeleteMapping` para semántica correcta, pero internamente solo se actualiza el boolean `activo`.

---

## 8. Utils (`utils/`)

Package global en `KuHub/utils/`. Clases disponibles (verificar antes de duplicar lógica):

- `PaginationUtils` — cálculo de paginación dinámica asimétrica (20/10 items)
- `StringUtils` — normalización de texto, capitalización, `normalizeToEnumKey`

Si se necesita nueva utilidad reutilizable en más de un módulo, va aquí.

---

## 9. Endpoints pendientes de implementación en backend

Los siguientes endpoints ya están consumidos por el frontend y esperan implementación en el backend.
Al implementarlos, seguir las convenciones de este documento y registrarlos en `SpringSecurityConfig`.

### `BloqueHorarioController` — rutas base `/api/v1/bloque-horario`

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| `PUT` | `/reasignar` | Recibe lista de bloques (`IBloqueReasignar[]`) con `idBloque?`, `numeroBloque`, `horaInicio`, `horaFin` (HH:mm:ss). Elimina los bloques actuales y persiste la nueva lista. Retorna `IBloqueHorario[]` actualizado. | ⬜ Pendiente |
| `POST` | `/restaurar-default` | Sin body. Restaura los 20 bloques horarios predeterminados hardcodeados en el INSERT original del cliente. Retorna `IBloqueHorario[]`. | ⬜ Pendiente |

**Valores predeterminados para `/restaurar-default`** (INSERT original del cliente):
```sql
(1,'08:01','08:40'), (2,'08:41','09:20'), (3,'09:31','10:10'), (4,'10:11','10:50'),
(5,'11:01','11:40'), (6,'11:41','12:20'), (7,'12:31','13:10'), (8,'13:11','13:50'),
(9,'14:01','14:40'), (10,'14:41','15:20'), (11,'15:31','16:10'), (12,'16:11','16:50'),
(13,'17:01','17:40'), (14,'17:41','18:20'), (15,'18:21','19:00'), (16,'19:01','19:40'),
(17,'19:41','20:20'), (18,'20:21','21:00'), (19,'21:01','21:40'), (20,'21:41','22:10')
```

**Nota de negocio:** El frontend valida que entre bloques consecutivos haya al menos 1 minuto de diferencia (hora_inicio[n+1] > hora_fin[n]). El backend debe validar lo mismo y lanzar excepción con `HttpStatus.UNPROCESSABLE_ENTITY` si hay conflicto.

### `SemanasController` — rutas base `/api/v1/semanas`

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| `PUT` | `/reasignar-semester-calendar` | Recibe `{ anio: int, semestre: int, nuevaFechaInicio: String (YYYY-MM-DD, debe ser lunes) }`. Busca las 18 semanas del año/semestre indicado y actualiza sus fechas a partir de la nueva fecha de inicio, manteniendo la estructura de nombres. Retorna `ISemana[]` actualizado. Lanzar `CONFLICT` si no existen semanas para ese año/semestre, `UNPROCESSABLE_ENTITY` si la fecha no es lunes. | ⬜ Pendiente |

**Nota de negocio:** El frontend calcula el preview de 18 semanas en tiempo real (base + i*7 días). El backend debe recalcular con la misma lógica y persistir. El impacto es en `solicitudes` y `conglomerados de pedido` que referencian las semanas afectadas — el equipo debe definir si se actualizan automáticamente las referencias o se notifica al usuario.

---

## 10. Checklist para nueva implementación

Antes de dar por terminada cualquier implementación, verificar:

- [ ] La entity va en el módulo correcto (confirmado con el desarrollador)
- [ ] El endpoint está registrado en `SpringSecurityConfig` con el rol correcto
- [ ] El controller tiene documentación JavaDoc indicando si está en uso en el frontend
- [ ] El DTO de request usa anotaciones de validación (no validaciones manuales con `if` en el service)
- [ ] El tipo de DTO de response es el correcto: DTO / Proyección / Record según la complejidad
- [ ] El repository sigue el orden: JPA derivados → @Query lectura → @Modifying → boolean
- [ ] El service tiene interfaz + implementación
- [ ] El método de update valida si el valor cambió antes de hacer set
- [ ] La eliminación usa `softDelete` (`activo = false`) y el controller devuelve `status(204)`
- [ ] Se usó `@Transactional(readOnly = true)` en los métodos de solo lectura
- [ ] Los métodos privados del service están al final de la clase
