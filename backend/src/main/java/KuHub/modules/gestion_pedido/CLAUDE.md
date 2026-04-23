# CLAUDE.md — Módulo gestion_pedido

Convenciones específicas para el módulo de **Gestión de Pedidos**. Para convenciones generales del backend, revisar `backend/CLAUDE.md`.

---

## 1. Estructura del módulo

```
gestion_pedido/
├── assemblers/          # Conversores entre entities y DTOs (si aplica)
├── controller/          # PedidoController, DetallePedidoController, PedidoSolicitudController
├── dtos/
│   ├── request/         # DTOs de entrada
│   │   └── ResumenHistoricoRequestDTO
│   └── response/        # DTOs y records de salida
│       └── ResumenHistoricoResponse
├── entity/              # Entidades: Pedido, DetallePedido, PedidoSolicitud
├── exceptions/          # GestionPedidoException
├── repository/          # Repositorios de acceso a datos
├── services/            # Interfaz + Implementación de servicios
└── CLAUDE.md            # Este archivo
```

---

## 2. Entidades principales

### 2.1 `Pedido`
- Representa un pedido en el sistema
- Estados: `PENDIENTE`, `APROBADO`, `EN_PREPARACION`, `ENTREGADO`, `CANCELADO`
- Relaciones:
  - 1:N con `DetallePedido` (ítems del pedido)
  - M:N con `Solicitud` (a través de `PedidoSolicitud`)
  - FK a `Usuario` (creador)

### 2.2 `DetallePedido`
- Detalle de cada producto en un pedido
- Campos principales:
  - `idPedido` (FK)
  - `idProducto` (FK)
  - `cantProductoPedido` (BigDecimal, cantidad solicitada)
  - `precioUnitario` (BigDecimal)
  - Timestamps de auditoría

### 2.3 `PedidoSolicitud`
- Tabla de asociación entre `Pedido` y `Solicitud`
- Permite múltiples solicitudes por pedido

---

## 3. Endpoints principales

### 3.1 Resumen Histórico de Pedidos
**Endpoint:** `GET /api/v1/gestion-pedido/resumen-historico`

**Request body:**
```json
{
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-12-31",
  "estadosCsv": "APROBADO,ENTREGADO"
}
```

**Response:**
```json
{
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-12-31",
  "estados": ["APROBADO", "ENTREGADO"],
  "totalProductosDistintos": 65,
  "totalPedidos": 4,
  "productos": [
    {
      "idProducto": 265,
      "codProducto": null,
      "nombreProducto": "Palos Bambu Con Nudo",
      "unidadMedida": "Unidad",
      "abreviatura": "un",
      "cantidadTotal": 22.000,
      "vecesEnPedidos": 2
    },
    ...
  ]
}
```

**Descripción:**
- Calcula agregaciones de consumo de productos por rango de fechas y estados
- Usa consulta JSONB nativa con subconsultas para calcular:
  - Total de productos distintos
  - Total de pedidos
  - Cantidad total consumida por producto
  - Veces que cada producto aparece en pedidos
- Resultado ordenado por cantidad total DESC

**Validación:**
- Fechas deben ser válidas (inicio <= fin)
- Estados deben ser válidos (APROBADO, ENTREGADO, etc.)
- Retorna status 400 si los parámetros son inválidos

---

## 4. Estructura de DTOs

### 4.1 Request DTOs
- Ubicación: `dtos/request/`
- Sufijo: `RequestDTO` o `...DTO`
- Anotaciones obligatorias: `@Getter @Setter @ToString @NoArgsConstructor @AllArgsConstructor`
- Validación con `@NotNull`, `@NotBlank`, `@DecimalMin`, etc.

### 4.2 Response DTOs / Records
- Ubicación: `dtos/response/`
- **Records** para respuestas complejas con anidamiento (paginación, agregaciones)
- **DTOs simples** para respuestas planas
- Incluir `@JsonPropertyOrder` para controlar orden de campos en JSON
- Implementar `fromRow(Object[])` para consultas nativas

---

## 5. Excepciones del módulo

### 5.1 GestionPedidoException
Base para todas las excepciones del módulo. Contiene `HttpStatus` para manejo consistente.

**Uso:**
```java
throw new GestionPedidoException("Pedido no encontrado", HttpStatus.NOT_FOUND);
```

### 5.2 Excepciones específicas (si aplica)
Pueden heredar de `GestionPedidoException`:
- `PedidoNoEncontradoException`
- `EstadoPedidoNoValidoException`
- `StockInsuficienteException`

---

## 6. Repositories

### 6.1 Orden de métodos
1. Métodos JPA derivados (findBy..., existsBy...)
2. @Query personalizadas (SELECT)
3. @Modifying + @Transactional (UPDATE/INSERT)
4. Métodos boolean de validación

### 6.2 Documentación en @Query
Cada columna con índice en comentarios:
```java
@Query(value = """
    SELECT
        p.id_producto,              -- [0]
        p.cod_producto,             -- [1]
        p.nombre_producto,          -- [2]
        um.nombre_unidad,           -- [3]
        um.abreviatura,             -- [4]
        SUM(dp.cant_producto_pedido) AS cantidad_total,  -- [5]
        COUNT(DISTINCT dp.id_pedido) AS veces_en_pedidos -- [6]
    FROM detalle_pedido dp
    JOIN pedido p ON p.id_pedido = dp.id_pedido
    ...
""", nativeQuery = true)
List<Object[]> findResumenHistorico(...);
```

---

## 7. Services

### 7.1 Estructura
- Interfaz: `PedidoService`, `DetallePedidoService`, etc.
- Implementación: `PedidoServiceImpl implements PedidoService`

### 7.2 Métodos base
Cada service debe implementar al menos:
- `findById(id)` — buscar por ID
- `findAll()` — listar todos (activos)
- `save(dto)` — crear nuevo
- `update(id, dto)` — actualizar
- `softDelete(id)` — eliminación lógica

### 7.3 Métodos de agregación
Para consultas complejas como el resumen histórico:
```java
ResumenHistoricoResponse obtenerResumenHistorico(
    LocalDate fechaInicio,
    LocalDate fechaFin,
    List<String> estados
);
```

---

## 8. Controller

### 8.1 Rutas base
- Ruta: `/api/v1/gestion-pedido`
- Métodos: GET, POST, PATCH, DELETE

### 8.2 Documentación JavaDoc
```java
/**
 * Obtiene resumen histórico de pedidos por rango de fechas y estados.
 * ✅ En uso: Consumido por reporteService en dashboard.
 */
@PostMapping("/resumen-historico")
public ResponseEntity<ResumenHistoricoResponse> obtenerResumenHistorico(
    @Validated @RequestBody ResumenHistoricoRequestDTO request) {
    ...
}
```

---

## 9. Checklist para nueva implementación en gestion_pedido

- [ ] La entity está en `entity/` y está activa (`activo = true` por defecto)
- [ ] DTOs están en `dtos/request/` o `dtos/response/` según corresponda
- [ ] El DTO de request usa validaciones (`@NotNull`, `@NotBlank`, etc.)
- [ ] El repository documenta índices con comentarios en @Query nativas
- [ ] El service tiene interfaz e implementación separadas
- [ ] El controller documenta si está en uso en frontend
- [ ] La ruta está registrada en `SpringSecurityConfig`
- [ ] Se usó `@Transactional(readOnly = true)` en métodos de lectura
- [ ] Las excepciones usan `GestionPedidoException`
- [ ] **`nota_alcance` fue actualizado** con la nueva funcionalidad

---

## 10. Integración con otros módulos

### 10.1 Dependencias
- **gestion_inventario**: Para validar productos y movimientos de stock
- **gestion_usuario**: Para auditoría de creador de pedido
- **gestion_solicitud**: Para relación pedidos-solicitudes

### 10.2 Transacciones distribuidas
Si una operación afecta múltiples módulos (ej: crear pedido + ajustar stock):
- Usar `@Transactional` en el service principal
- Capturar excepciones de otros servicios
- Mantener consistencia con rollback automático

---

## Última actualización
- **Fecha**: 2026-04-23
- **Cambio**: Creación de estructura base del módulo con DTOs, exceptions y convenciones
- **Archivos**: GestionPedidoException, ResumenHistoricoRequestDTO, ResumenHistoricoResponse
