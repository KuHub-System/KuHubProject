# CONTEXTO ORDEN PEDIDO — Documentación Técnica Aislada

## 📌 Nota sobre este documento

Este archivo aísla toda la información relacionada a **Orden Pedido (OP)** extraída de `CONTEXTO_PROVEEDORES.MD` (secciones 18, 13.10, 13.12 y 20). Se proporciona como referencia técnica independiente para la implementación y mantenimiento del módulo `gestion_orden_pedido`.

**Fuente original:** `CONTEXTO_PROVEEDORES.MD` (líneas 2693–3578 aprox.)  
**Última actualización:** 2026-05-21  
**Estado:** ✅ Implementación completada (Pasos 1 y 2 del frontend; endpoints GET listos)

---

## ÍNDICE

1. **Objetivo y Casos de Uso**
2. **Diseño de BD — Tablas nuevas**
3. **Índices y Relaciones**
4. **Reglas de Negocio**
5. **Módulo Backend — Estructura**
6. **Entidades Java**
7. **DTOs**
8. **Endpoints**
9. **Frontend — Tipos TypeScript**
10. **Frontend — Servicios**
11. **UX Flow — Modal "Generar Orden Pedido"**
12. **Lógica de Distribución de Entregas (Crítica)**
13. **Plan de Persistencia Futura**

---

## 1. OBJETIVO Y CASOS DE USO

Crear el concepto de **Orden Pedido** que permite:

1. **Generar la orden hacia el proveedor** — documento formal con los productos que se le solicitan, listo para enviar.
2. **Abastecimiento en la llegada** — al llegar la mercadería, la orden sirve como referencia para registrar qué entró al inventario.
3. **Indicador en pedido** — desde la vista del pedido se puede saber si ya existe una OP vinculada, para informar al equipo de gestión.

> ⚠️ **No se almacena fecha de entrega en esta tabla.** El día de entrega del proveedor se obtiene consultando `proveedor_dia_entrega`. Se integrará en una fase posterior.

> **Aclaración de nomenclatura:** La tabla de pedidos en el sistema se llama `pedido` (no `pedido_consolidado`). Campos: `id_pedido`, `fecha_inicio_pedido`, `fecha_fin_pedido`, `estado_pedido` (ENUM: PENDIENTE/APROBADO/ENTREGADO/RECHAZADO). Sin FK directa a `semanas` — se relaciona por coincidencia de fechas.

---

## 2. DISEÑO DE BD — TABLAS NUEVAS

> ⚠️ No usar `ALTER TABLE` — agregar en el `CREATE TABLE` de `ConexionXD_v2.sql`. El script se corre desde cero.
>
> 📍 **Ubicación en el SQL:** después de `pedido_solicitud` (línea ~736) y antes de los `INSERT INTO gestion_sistema`. El diseño original decía "después de `proveedor_dia_entrega`" pero esto **fallaría** porque `orden_pedido.id_pedido` referencia `pedido` (línea 706) que se define más abajo en el script. ✅ implementado 2026-05-20.

### 2.1 Tabla `orden_pedido`

```sql
CREATE TABLE orden_pedido (
    id_orden_pedido   SERIAL    PRIMARY KEY,
    id_pedido         INTEGER   NOT NULL
        REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    id_proveedor      INTEGER   NOT NULL
        REFERENCES proveedor(id_proveedor) ON DELETE RESTRICT,
    fecha_creacion    TIMESTAMP NOT NULL DEFAULT NOW(),
    observaciones     TEXT,
    activo            BOOLEAN   NOT NULL DEFAULT TRUE
);
```

**Relaciones:**
- `id_pedido` → FK a `pedido.id_pedido` (tabla real del sistema)
- `id_proveedor` → FK a `proveedor.id_proveedor`

**Sin `estado_orden`:** La OC no tiene estado propio en esta versión. El ciclo de vida se gestiona a través del `activo` + el `estado_pedido` del pedido vinculado. Se podrá agregar en una fase futura si se requiere seguimiento de envío/recepción.

**Sin `fecha_entrega`:** Se calcula en runtime desde `proveedor_dia_entrega`. No se persiste.

### 2.2 Tabla `detalle_orden_pedido`

```sql
CREATE TABLE detalle_orden_pedido (
    id_detalle_orden_pedido SERIAL          PRIMARY KEY,
    id_orden_pedido         INTEGER         NOT NULL
        REFERENCES orden_pedido(id_orden_pedido) ON DELETE CASCADE,
    id_producto             INTEGER         NOT NULL
        REFERENCES producto(id_producto) ON DELETE RESTRICT,
    cantidad_solicitada     NUMERIC(10,3)   NOT NULL,
    precio_neto_unitario    NUMERIC(10,3),  -- tomado del proveedor_producto al momento de crear la OC
    precio_con_iva_unitario NUMERIC(10,3),  -- igual
    activo                  BOOLEAN         NOT NULL DEFAULT TRUE
);
```

**Relaciones:**
- `id_orden_pedido` → FK a `orden_pedido.id_orden_pedido` con `ON DELETE CASCADE`
- `id_producto` → FK a `producto.id_producto`

**Precios como snapshot:** Se copian del `proveedor_producto` vigente al crear la OC. Si el proveedor actualiza precios después, la OC mantiene los valores acordados originalmente.

### 2.3 Tabla `entrega_orden_pedido` ← (Opción A — Futuro)

Persiste la distribución de cantidad por día de entrega editada por el usuario en el modal.
Un mismo producto puede tener 1 o más filas aquí (una por cada columna E del proveedor).

```sql
CREATE TABLE entrega_orden_pedido (
    id_entrega_oc    SERIAL          PRIMARY KEY,
    id_detalle_oc    INTEGER         NOT NULL
        REFERENCES detalle_orden_pedido(id_detalle_orden_pedido) ON DELETE CASCADE,
    dia_semana       DiaSemana       NOT NULL,     -- LUNES | MARTES | ... | DOMINGO
    semana_anterior  BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE = entrega cae en semana anterior a la del pedido
    cantidad         NUMERIC(10,3)   NOT NULL
);
```

**Por qué es necesaria:** `detalle_orden_pedido.cantidad_solicitada` guarda el TOTAL del producto.
Pero las columnas E (entrega) del modal son **editables e independientes** — el usuario puede
redistribuir la cantidad entre los días de entrega del proveedor (ej: 20L el Jue + 25L el Mar).
Sin esta tabla, esas decisiones se perderían al cerrar el modal.

**Relación:** 1 `detalle_orden_pedido` → N `entrega_orden_pedido` (una por cada columna E del proveedor para ese producto).

---

## 3. ÍNDICES Y RELACIONES

```sql
CREATE INDEX idx_op_pedido    ON orden_pedido (id_pedido)    WHERE activo = TRUE;
CREATE INDEX idx_op_proveedor ON orden_pedido (id_proveedor) WHERE activo = TRUE;
CREATE INDEX idx_dop_orden    ON detalle_orden_pedido (id_orden_pedido);
CREATE INDEX idx_eoc_detalle  ON entrega_orden_pedido (id_detalle_oc);
```

---

## 4. REGLAS DE NEGOCIO

| Regla | Detalle |
|-------|---------|
| Una OP por proveedor | Si hay múltiples proveedores para un pedido, se crean múltiples OPs (una por proveedor) |
| Precios son snapshot | Se copian de `proveedor_producto` vigente al momento de creación |
| Sin estado propio | La OP no tiene `estado_orden` — ciclo de vida gestionado por `activo` + estado del pedido vinculado |
| Sin fecha entrega persistida | Se consulta dinámicamente desde `proveedor_dia_entrega` |
| Indicador en pedido | `EXISTS (SELECT 1 FROM orden_pedido WHERE id_pedido = ? AND activo = TRUE)` |
| Solo pedidos APROBADO | El modal solo lista pedidos con `estado_pedido = 'APROBADO'` |
| Soft-delete | `activo = FALSE` en ambas tablas |

---

## 5. MÓDULO BACKEND — ESTRUCTURA

```
backend/src/main/java/KuHub/modules/gestion_orden_pedido/
├── controller/OrdenPedidoController.java
├── entity/
│   ├── OrdenPedido.java
│   └── DetalleOrdenPedido.java
├── repository/
│   ├── OrdenPedidoRepository.java
│   └── DetalleOrdenPedidoRepository.java
├── service/
│   ├── OrdenPedidoService.java
│   └── OrdenPedidoServiceImpl.java
└── dtos/
    ├── request/
    │   ├── OrdenPedidoCreateDTO.java
    │   └── DetalleOrdenPedidoItemDTO.java
    └── response/
        ├── PedidoSemanaResumenDTO.java   ← para el Paso 1
        ├── OrdenPedidoResumenDTO.java
        └── OrdenPedidoDetalleDTO.java
```

---

## 6. ENTIDADES JAVA

### 6.1 Entidad `OrdenPedido.java`

```java
@Entity
@Table(name = "orden_pedido")
@Data @NoArgsConstructor @AllArgsConstructor
public class OrdenPedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idOrdenPedido;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_pedido", nullable = false)
    private Pedido pedido;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_proveedor", nullable = false)
    private Proveedor proveedor;
    
    @Column(nullable = false)
    private LocalDateTime fechaCreacion;
    
    @Column(columnDefinition = "TEXT")
    private String observaciones;
    
    @Column(nullable = false)
    private Boolean activo;
    
    @OneToMany(mappedBy = "ordenPedido", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetalleOrdenPedido> detalles = new ArrayList<>();
}
```

### 6.2 Entidad `DetalleOrdenPedido.java`

```java
@Entity
@Table(name = "detalle_orden_pedido")
@Data @NoArgsConstructor @AllArgsConstructor
public class DetalleOrdenPedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idDetalleOrdenPedido;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_orden_pedido", nullable = false)
    private OrdenPedido ordenPedido;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;
    
    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal cantidadSolicitada;
    
    @Column(precision = 10, scale = 3)
    private BigDecimal precioNetoUnitario;
    
    @Column(precision = 10, scale = 3)
    private BigDecimal precioConIvaUnitario;
    
    @Column(nullable = false)
    private Boolean activo;
}
```

---

## 7. DTOs

### 7.1 Request DTOs

```java
public record OrdenPedidoCreateDTO(
    @NotNull Integer idPedido,
    @NotNull Integer idProveedor,
    String observaciones,
    @NotEmpty List<DetalleOrdenPedidoItemDTO> detalle
) {}

public record DetalleOrdenPedidoItemDTO(
    @NotNull Integer idProducto,
    @NotNull @DecimalMin("0.001") BigDecimal cantidadSolicitada
    // precios: snapshot automático desde proveedor_producto vigente
) {}

public record EntregaDistribucionDTO(
    @NotNull Integer idProducto,
    @NotNull String diaEntrega,           // "LUNES" | "MARTES" | …
    @NotNull Boolean semanaAnterior,      // true si cae en semana anterior
    @NotNull @DecimalMin("0.001") BigDecimal cantidad  // cantidad para ese día de entrega
) {}
```

### 7.2 Response DTOs

```java
public record PedidoSemanaResumenDTO(
    Integer idPedido,
    LocalDate fechaInicioPedido,
    LocalDate fechaFinPedido,
    String estadoPedido,
    int cantidadOrdenPedido,   // 0 / 1 / ≥2
    boolean tieneOrdenPedido   // = cantidadOrdenPedido > 0
) {}

// Estructura jerárquica del Paso 2 (cotización consolidada)
public record CotizacionConsolidadaResponse(
    List<ProveedorGrupoConsolidado> cotizacion
) {}

public record ProveedorGrupoConsolidado(
    Integer idProveedor,                 // null = bucket "Sin proveedor"
    String nombreDistribuidora,
    String nombreProveedor,
    String telefono,
    String email,
    Integer totalProductos,
    BigDecimal totalNeto,
    BigDecimal totalConIva,
    List<String> diasEntrega,            // [LUNES, MARTES, ...] o null
    List<CategoriaGrupoConsolidado> categorias
) {}

public record CategoriaGrupoConsolidado(
    Integer idCategoria,
    String nombreCategoria,
    List<ProductoConsolidado> productos
) {}

public record ProductoConsolidado(
    Integer idProducto,
    String nombreProducto,
    String abreviatura,
    Boolean esFraccionario,
    BigDecimal cantidadTotal,            // SUM read-only
    BigDecimal precioNeto,               // VALOR UNITARIO neto
    BigDecimal precioConIva,             // VALOR UNITARIO con IVA
    List<CantidadDiaConsolidado> cantidadPorDia
) {}

public record CantidadDiaConsolidado(
    String dia,                          // "LUNES" .. "DOMINGO" o "SIN_DIA"
    BigDecimal cantidad
) {}

public record OrdenPedidoDetalleDTO(
    Integer idOrdenPedido,
    Integer idPedido,
    Integer idProveedor,
    LocalDateTime fechaCreacion,
    String observaciones,
    List<DetalleOPDTO> detalles
) {}

public record DetalleOPDTO(
    Integer idDetalleOp,
    Integer idProducto,
    String nombreProducto,
    BigDecimal cantidadSolicitada,
    BigDecimal precioNetoUnitario,
    BigDecimal precioConIvaUnitario,
    List<EntregaDistribucionDTO> entregas
) {}
```

---

## 8. ENDPOINTS

| Método | URL | Descripción | Estado |
|--------|-----|-------------|--------|
| `GET` | `/api/v1/orden-pedido/pedidos-semana` | Pedidos APROBADO para una semana + contador de OP | ✅ implementado 2026-05-20 |
| `GET` | `/api/v1/orden-pedido/cotizacion-consolidada` | Cotización jerárquica (Proveedor→Categoría→Producto) con menor precio neto, cantidades consolidadas | ✅ implementado 2026-05-20 |
| `POST` | `/api/v1/orden-pedido` | Crear OP con detalle | ⏳ pendiente (fase posterior) |
| `GET` | `/api/v1/orden-pedido/{id}` | Detalle completo de una OP | ⏳ pendiente |
| `GET` | `/api/v1/orden-pedido/pedido/{idPedido}` | OP vinculadas a un pedido | ⏳ pendiente |
| `GET` | `/api/v1/orden-pedido/proveedor/{idProveedor}` | OP de un proveedor | ⏳ pendiente |
| `DELETE` | `/api/v1/orden-pedido/{id}` | Soft-delete (`activo = FALSE`) | ⏳ pendiente |

### 8.1 Endpoint Paso 1 — `GET /api/v1/orden-pedido/pedidos-semana`

**Parámetros:** `?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD`

**Query nativa (subconsulta con `COUNT(*)` para distinguir 0/1/≥2 OPs):**
```sql
SELECT
    p.id_pedido,
    p.fecha_inicio_pedido,
    p.fecha_fin_pedido,
    p.estado_pedido::text,
    (
        SELECT COUNT(*) FROM orden_pedido oc
        WHERE oc.id_pedido = p.id_pedido
          AND oc.activo = TRUE
    ) AS cantidad_orden_pedido
FROM pedido p
WHERE p.estado_pedido = 'APROBADO'
  AND p.fecha_inicio_pedido >= :fechaInicio
  AND p.fecha_fin_pedido <= :fechaFin
ORDER BY p.fecha_inicio_pedido ASC
```

### 8.2 Endpoint Paso 2 — `GET /api/v1/orden-pedido/cotizacion-consolidada`

**Parámetros:** `?idsPedido=1,2,3` (CSV — Spring deserializa a `List<Integer>`).

**Query nativa (CTE Patrón C con `jsonb_agg`):** NO usa `detalle_pedido`. Cadena real:
- `pedido(APROBADO)` → `pedido_solicitud` → `solicitud(EN_PEDIDO)`
  - `reserva_sala` → `dia_semana`
  - `detalle_solicitud` → `producto`
    - `categoria`
    - `unidad_medida`

Por cada producto se calcula:
- `cantidadTotal` = SUM(detalle_solicitud.cant_producto_solicitud)
- `cantidadPorDia[]` = SUM agrupado adicionalmente por reserva_sala.dia_semana (solicitudes sin reserva_sala caen en "SIN_DIA")
- `precioNeto/ConIva` = del proveedor con MENOR precio_neto vigente (DISTINCT ON proveedor_producto.activo + estado DISPONIBLE)

Por cada proveedor además se incluye:
- `diasEntrega[]` = de proveedor_dia_entrega.dia_semana (activo = TRUE)

Estructura jerárquica devuelta: **Proveedor → Categoría → Producto** + diasEntrega + cantidadPorDia.

---

## 9. FRONTEND — TIPOS TYPESCRIPT

```typescript
// Agregar en proveedor.types.ts

export interface IPedidoSemanaResumen {
  idPedido: number;
  fechaInicioPedido: string;     // "YYYY-MM-DD"
  fechaFinPedido: string;        // "YYYY-MM-DD"
  estadoPedido: string;
  cantidadOrdenPedido: number;   // 0 / 1 / ≥2
  tieneOrdenPedido: boolean;     // = cantidadOrdenPedido > 0
}

// Estructura jerárquica del Paso 2 (cotización consolidada)
export interface ICotizacionConsolidadaResponse {
  cotizacion: IProveedorGrupoConsolidado[];
}

export interface IProveedorGrupoConsolidado {
  idProveedor: number | null;          // null = bucket "Sin proveedor"
  nombreDistribuidora: string | null;
  nombreProveedor: string | null;
  telefono: string | null;
  email: string | null;
  totalProductos: number;
  totalNeto: number;
  totalConIva: number;
  diasEntrega: TDiaSemana[] | null;    // ["LUNES","MARTES",…] — null para "Sin proveedor"
  categorias: ICategoriaGrupoConsolidado[];
}

export interface ICategoriaGrupoConsolidado {
  idCategoria: number;
  nombreCategoria: string;
  productos: IProductoConsolidado[];
}

export interface IProductoConsolidado {
  idProducto: number;
  nombreProducto: string;
  abreviatura: string;                  // "KG", "L", "UN"…
  esFraccionario: boolean;
  cantidadTotal: number;                // SUM cant_producto_solicitud — read-only
  precioNeto: number | null;            // VALOR UNITARIO neto
  precioConIva: number | null;          // VALOR UNITARIO con IVA
  cantidadPorDia: ICantidadDia[];       // distribución de la cantidad por día de la semana
  // cantidadRequerida (number) se agrega en el cliente al inicializar el estado del modal.
}

export interface ICantidadDia {
  dia: TDiaSemana | 'SIN_DIA';          // SIN_DIA = solicitud sin id_reserva_sala
  cantidad: number;
}

export type TDiaSemana =
  | 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES'
  | 'VIERNES' | 'SABADO' | 'DOMINGO';

// Futuro — para creación de OP
export interface IEntregaDistribucion {
  idProducto: number;
  diaEntrega: TDiaSemana;
  semanaAnterior: boolean;
  cantidad: number;
}

export interface ICrearOrdenPedidoRequest {
  idPedido: number;
  idProveedor: number;
  observaciones?: string;
  distribuciones: IEntregaDistribucion[];
}

export interface IOrdenPedidoCreada {
  idOrdenPedido: number;
  idPedido: number;
  idProveedor: number;
  fechaCreacion: string;
  observaciones: string | null;
  detalleProductos: Array<{
    idDetalleOc: number;
    idProducto: number;
    nombreProducto: string;
    cantidadSolicitada: number;
    precioNeto: number;
    precioConIva: number;
    entregas: IEntregaDistribucion[];
  }>;
}
```

---

## 10. FRONTEND — SERVICIOS

**Archivo:** `frontend/src/services/proveedor-service.ts`

```typescript
export const obtenerPedidosSemanaService = async (
  fechaInicio: string,
  fechaFin: string
): Promise<IPedidoSemanaResumen[]> => {
  const response = await api.get('/orden-pedido/pedidos-semana', {
    params: { fechaInicio, fechaFin }
  });
  return response.data;
};

export const obtenerCotizacionConsolidadaService = async (
  idsPedido: number[]
): Promise<ICotizacionConsolidadaResponse> => {
  const response = await api.get('/orden-pedido/cotizacion-consolidada', {
    // Spring acepta tanto ?idsPedido=1&idsPedido=2 como ?idsPedido=1,2 — usamos CSV
    params: { idsPedido: idsPedido.join(',') }
  });
  return response.data;
};

// Futuro — para crear orden pedido
export const crearOrdenPedidoService = async (
  request: ICrearOrdenPedidoRequest
): Promise<IOrdenPedidoCreada> => {
  try {
    const response = await api.post<IOrdenPedidoCreada>(
      '/orden-pedido',
      request
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      `Error al crear Orden Pedido para proveedor ${request.idProveedor}`
    );
  }
};
```

---

## 11. UX FLOW — MODAL "GENERAR ORDEN PEDIDO" (2 PASOS)

**Botón en `gestion-proveedores.tsx`:** Entre "Sincronizar Precios Excel" y "Proyección Cotización", condicional `prov_Editar`, icono `lucide:clipboard-list`.

### Paso 1 — Selección de pedidos de la semana

```
Modal (tamaño 3xl)
├── 2 selectores (idénticos a pedido-semanal-a-bodega.tsx):
│     ├── Select Período  (año-semestre) ← usa usePeriodoSemana() context
│     └── Select Semana   ← semanas del período elegido
│
└── Al seleccionar semana → GET /api/v1/orden-pedido/pedidos-semana?fechaInicio=X&fechaFin=Y
    Filtra: estado_pedido = 'APROBADO', fechas dentro de la semana
    Cada ítem retorna: idPedido, fechaInicio, fechaFin, estadoPedido,
                       cantidadOrdenPedido (int), tieneOrdenPedido (derivado)

    Tabla de resultados:
    ┌──────┬──────────────────────────┬───────────┬──────────────────────────────────────────┐
    │  [☑] │ 2026-05-11 → 2026-05-17  │ [APROBADO]│ [OC Generada]                            │
    │  [☐] │ 2026-05-11 → 2026-05-17  │ [APROBADO]│ [Sin OC]                                 │
    │  [☐] │ 2026-05-11 → 2026-05-17  │ [APROBADO]│ ⚠ Ya existe un registro para este pedido │
    └──────┴──────────────────────────┴───────────┴──────────────────────────────────────────┘

    Mapeo del chip según cantidadOrdenPedido:
      0   → chip default  "Sin OC"
      1   → chip success  "OC Generada"
      ≥2  → chip warning  "Ya existe un registro para este pedido"
            (NO bloquea selección — solo informa)

    Checkboxes para selección múltiple.

[Botón "← Volver"]  → cierra el modal
[Botón "Generar"]   → habilitado solo si ≥1 pedido seleccionado → Paso 2
```

### Paso 2 — Cotización consolidada (menor precio + distribución por día)

**Al presionar "Generar" en el Paso 1, se envían los IDs de pedidos seleccionados:**
```
GET /api/v1/orden-pedido/cotizacion-consolidada?idsPedido=1,2,3
```

**Estructura jerárquica devuelta: Proveedor → Categoría → Producto + diasEntrega + cantidadPorDia.**

**Regla de agrupación (lógica de FRONTEND):**

> **Caso especial — proveedor con UN SOLO día de entrega (`diasEntrega.length === 1`):**
> TODO lo solicitado de la semana se entrega en ese único día de **ESTA semana**, sin
> aplicar la regla de bloques (no se mueve a la semana anterior).
>
> **Caso general — proveedor con ≥ 2 días de entrega:**
> 1. Tomar la lista `cantidadPorDia[]` del producto y agrupar los días con cantidad > 0
>    que sean **consecutivos** en bloques.
> 2. Para cada bloque, su **fecha de entrega** es el día de entrega del proveedor (de
>    `diasEntrega[]`) **inmediatamente ANTERIOR** al primer día del bloque, mapeado a la
>    fecha real de la semana elegida. Si no hay día de entrega anterior en la semana base,
>    se usa el ÚLTIMO día de entrega del proveedor en la SEMANA ANTERIOR.
> 3. La cantidad de esa celda = SUMA de las cantidades del bloque.

**Pseudocódigo (cliente):**
```ts
// CASO ESPECIAL — un solo día de entrega
if (diasEntrega.length === 1) {
  const fechaEntrega = fechaDe(semanaBase, diasEntrega[0]);   // ESTA semana
  registrarColumna(fechaEntrega, producto.idProducto, sumarTodos(producto.cantidadPorDia));
  return;
}

// CASO GENERAL — ≥ 2 días de entrega
for (const bloque of agruparConsecutivos(producto.cantidadPorDia.filter(d => d.cantidad > 0))) {
  const primerDia    = bloque.dias[0];                        // "MIERCOLES"
  const ant          = diasEntrega.findLast(d => orden(d) < orden(primerDia));
  const fechaEntrega = ant
      ? fechaDe(semanaBase, ant)                              // mismo lunes…domingo
      : fechaDe(semanaAnterior, diasEntrega.at(-1));          // último día sem anterior
  registrarColumna(fechaEntrega, producto.idProducto, sumar(bloque.cantidades));
}
// Luego se unifican todas las columnas del proveedor en orden cronológico.
```

**Comportamiento de TODAS las celdas (✎ = editable):**
- **Cant Tot** y **cada "Entrega &lt;fecha&gt;"** son **editables** e INDEPENDIENTES — el
  frontend no fuerza que `Σ Entrega = Cant Tot` (el usuario puede ajustar libremente).
- Cambiar **Cant Tot** → recalcula totales del proveedor (`precio × Cant Tot`).
- Cambiar una celda **"Entrega &lt;fecha&gt;"** → no afecta los totales (los totales se
  calculan con `Cant Tot`, no con la suma de entregas).
- **P.Neto / P.IVA** del producto → read-only del backend (unitarios).

**Ejemplo visual:**
```
┌──────────────────────────┬─────┬──────────┬──────────────────────────┬──────────────────────────┐
│ Producto                 │ Und │ Cant Tot │ Entrega Jue 2026-05-21   │ Entrega Mar 2026-05-26   │
│                          │     │   (✎)    │   (✎)                    │   (✎)                    │
├──────────────────────────┼─────┼──────────┼──────────────────────────┼──────────────────────────┤
│ Aceite Vegetal Maravilla │  L  │ [45.000] │       [ 20.000 ]         │       [ 25.000 ]         │
│ Leche Entera 1L          │  L  │ [80.000] │       [ 50.000 ]         │       [ 30.000 ]         │
└──────────────────────────┴─────┴──────────┴──────────────────────────┴──────────────────────────┘
     Total neto: $ 215.700     Total c/IVA: $ 256.683
                                                      (recalculados en cliente)
```

**Botones:**
- `[← Volver]` → regresa a Paso 1 manteniendo selección
- `[Continuar]` → (fase posterior) confirmar y crear UNA OP por cada proveedor

---

## 12. LÓGICA DE DISTRIBUCIÓN DE ENTREGAS — CRÍTICA

### ⚠️ Problema Identificado (2026-05-21)

La tabla de Orden Pedido **asignaba incorrectamente los días de entrega** — no anticipaba el hecho de que la entrega debe ocurrir **ANTES** de que se necesite el producto. Usaba lógica de "siguiente entrega disponible" (wrap-around), pero la correcta es **"última entrega ANTERIOR a cuándo se necesita"** (prospectiva).

**Ejemplo del cambio:**

Escenario real:
- Proveedor entrega: MARTES y JUEVES (cada semana)
- Pedidos necesarios para: LUNES a SÁBADO (próxima semana del 28-05 al 02-06)
- Día de hoy: 21-05 (Jueves de esta semana)

| Necesito para | Antes (❌ INCORRECTO) | Ahora (✅ CORRECTO) |
|---|---|---|
| LUNES (28/05) | MARTES (29/05) — llega DESPUÉS | JUEVES (21/05) — ya disponible |
| MARTES (29/05) | JUEVES (31/05) — llega DESPUÉS | JUEVES (21/05) — ya disponible |
| MIÉRCOLES (30/05) | JUEVES (31/05) — llega DESPUÉS | MARTES (26/05) — 1 día antes |
| JUEVES (31/05) | MARTES semana siguiente — demasiado tarde | MARTES (26/05) — 2 días antes |

### ✅ Algoritmo de Asignación de Entregas — CORRECTO

Para cada **día de necesidad** `diaNecesidad` (de 1 a 6: Lunes a Sábado de la próxima semana):

1. Obtener lista de **días de entrega** del proveedor (ej: [MARTES, JUEVES])
2. Convertir a números: [2, 4]
3. **Buscar el MAYOR día de entrega que sea ESTRICTAMENTE ANTERIOR a `diaNecesidad`**
   - Buscar backwards en la lista ordenada para encontrar `max(diaEntrega < diaNecesidad)`
4. **Si existe** → usar ese día para entregar (misma semana de necesidad)
5. **Si NO existe** → significa `diaNecesidad ≤ min(días de entrega)`
   - Fallback: usar el **ÚLTIMO día de entrega de la SEMANA ANTERIOR**
   - En la UI se interpreta como "entregar esta semana" (hoy o antes) mediante ajuste de fechas

### ✅ Implementación en Frontend

**Archivo:** `frontend/src/pages/gestion-proveedores.tsx`

1. **`ColSpecOC` type** — Agregado `semanaAnterior?: boolean` al tipo `'entrega'` para distinguir entregas de semana anterior.

2. **`getEntregaKey()` helper** — Retorna claves compuestas: `"JUEVES_prev"` para semana anterior, `"JUEVES"` para semana actual. Evita colisiones de claves en el estado `ocCantidades`.

3. **`buildColsOC()`** — Reescrita con lógica **prospectiva**:
   - Itera días de necesidad 1-6
   - Para cada día: busca el MÁXIMO día de entrega < día de necesidad
   - Si no existe: fallback = último día de entrega (semana anterior, marcado con `semanaAnterior: true`)
   - Retorna columnas en orden: **E (entrega) primero, luego P (cant) que cubre**
   - Caso especial: 1 solo día de entrega → todo va a ese día de ESTA semana (sin marcar como `semanaAnterior`)

4. **`construirCantidades()` rama ≥2** — Reescrita con la misma lógica prospectiva:
   - Para cada día de necesidad con cantidad > 0
   - Busca la entrega que lo cubre (último anterior)
   - Acumula en clave compuesta: `"JUEVES_prev"` o `"JUEVES"`

5. **`fechaExactaEntrega()`** — Actualizada:
   - Acepta parámetro `semanaAnterior?: boolean`
   - Cuando es `true`, descuenta 7 días al lunes base para mostrar fecha de semana anterior
   - Ejemplo: semana 25-31 de mayo, entrega JUEVES_prev → muestra 21/05, no 28/05

6. **Render headers** — Cambios:
   - Columnas 'entrega' pasan `col.semanaAnterior` a `fechaExactaEntrega()`
   - Muestran asterisco `*` si es semana anterior: `"Entrega Jue*"`
   - Columnas 'cant' ahora también muestran la fecha real del día de pedido: `"Cant. / Lun / 25/05"`
   - Claves únicas: `entrega-{getEntregaKey(col)}` y `cant-{col.dia}` (evita duplicados React)

7. **Render celdas** — Cambios:
   - Usa `entregaKey = getEntregaKey(col)` para lookup en `entregasProd`
   - Pasa `entregaKey` al handler `onCantidadChange()` (en lugar de solo `col.dia`)
   - Estado `ocCantidades` ahora soporta claves compuestas

### ✅ Resultado Visual

Tabla de Orden Pedido ahora muestra:
```
E JUE*        P LUN       P MAR       E MAR        P MIE       P JUE       E JUE
21/05         25/05       26/05       26/05        27/05       28/05       28/05
(auto, 350)   (gris)      (gris)      (amarillo)   (gris)      (gris)      (amarillo)
```

- **E JUE*** viene PRIMERO (21/05 — semana anterior), cubre LUN y MAR
- **P LUN, P MAR** muestran fecha real y cantidad requerida para ese día
- **E MAR** viene ANTES de P MIE y P JUE que cubre
- **Anticipo claro**: es evidente que la entrega llega ANTES de lo necesario

---

## 12.A. FUNCIONAMIENTO ACTUAL PASO 2 — TABLA DE COTIZACIÓN CONSOLIDADA

### Estructura Visual Actual

La tabla del Paso 2 muestra para cada proveedor un layout dinámico con columnas alternas generadas según la lógica de `buildColsOC()`:

```
┌─────────────────────┬─────┬──────────┬────────────────────┬────────────────────┬──────────┬──────────┐
│ Producto            │ U/M │ Total    │ Cant. LUN (25/05)   │ Cant. MAR (26/05)  │ P.Neto   │ P.IVA    │
│                     │     │ Solicitado           [read-only]       [read-only]     │ [read-only] [read-only] │
├─────────────────────┼─────┼──────────┼────────────────────┼────────────────────┼──────────┼──────────┤
│ [Entrega JUE (21/05)]║                                                            │          │          │
│ (semana anterior)   ║                                                            │          │          │
│ [editable]          ║                                                            │          │          │
├─────────────────────┼─────┼──────────┼────────────────────┼────────────────────┼──────────┼──────────┤
│ Aceite Vegetal      │ L   │  65.000  │     30.000         │      35.000         │ $5.200   │ $6.188   │
│ [Entrega JUE]       │     │          │   [30.000 ref]     │   [35.000 ref]      │          │          │
│ [editable]          │     │          │   [ _ cantidad _]  │   [ _ cantidad _]   │          │          │
├─────────────────────┼─────┼──────────┼────────────────────┼────────────────────┼──────────┼──────────┤
│ Leche Entera 1L     │ L   │  80.000  │     50.000         │      30.000         │ $1.200   │ $1.428   │
│ [Entrega MAR (26/05)]║     │          │   [50.000 ref]     │   [30.000 ref]      │          │          │
│ [editable]          ║     │          │   [ _ cantidad _]  │   [ _ cantidad _]   │          │          │
│                     ║     │          │                    │                     │          │          │
└─────────────────────┴─────┴──────────┴────────────────────┴────────────────────┴──────────┴──────────┘
```

### Comportamiento Actual (SIN Redistribución Inteligente)

**Columnas de Cantidad (`Cant. {DÍA}`):**
- **Read-only** — muestran la cantidad **requerida** para ese día de la semana
- Vienen del backend en `cantidadPorDia[]` del DTO `IProductoConsolidado`
- Ejemplo: "Aceite necesario el lunes: 30.000 litros"
- No pueden ser editadas directamente

**Columnas de Entrega (`Entrega {DÍA}` o `Entrega {DÍA}*` si semana anterior):**
- **Editables** — el usuario puede cambiar la cantidad a entregar en ese día
- Componente `EntregaInput` con validación numérica
- Inicialmente pobladas según `construirCantidades()` (distribución prospectiva automática)
- **Totalmente independientes** — cambiar la cantidad en un día de entrega NO afecta otros días
- No hay validación que fuerce coherencia con "Total Solicitado" (columna 3)

**Columnas de Precio (`P.Neto`, `P.IVA`):**
- **Read-only**
- Precio unitario snapshot del proveedor al momento de crear la cotización
- Subtotales se calculan como: `Cant.Total × Precio.Unitario`

### Problema Identificado

**Actualmente, cada celda de entrega es independiente:**
- El usuario edita la cantidad del JUE sin considerar MAR
- Si agrega 10 unidades más en JUE (30→40), esas 10 se "duplican" conceptualmente
- No hay algoritmo que "transfiera" cantidades entre días de entrega
- El usuario debe editar manualmente cada columna manteniéndose consistente

**Impacto:** Es tedioso y error-prone distribuir grandes pedidos entre múltiples días de entrega.

---

## 12.B. TAREA PENDIENTE: REDISTRIBUCIÓN INTELIGENTE DE CANTIDADES

### Descripción de la Funcionalidad Nueva

Implementar un sistema de redistribución dinámica e inteligente donde:

1. **El usuario edita una celda de entrega** (ej: cambia JUE de 30 → 50 litros)
2. **El sistema detecta la variación** (+20 litros en JUE)
3. **El sistema redistribuye automáticamente** restando de otros días de entrega de forma inteligente:
   - Si el usuario **aumenta** cantidad en JUE → se restan de MAR (siguiente día de entrega)
   - Si MAR llega a cero → se continúa restando de los días posteriores
   - Si el usuario **disminuye** cantidad en JUE → se suman a MAR, luego a los posteriores
4. **El usuario siempre ve la distribución clara** — no se "pierden" cantidades
5. **Facilitar la edición dinámica** con botones +/- para incremento/decremento unitario (sin teclado)

### Caso de Uso Concreto

**Escenario inicial (después de que el backend calcula la distribución):**
```
Producto: Aceite Vegetal (65.000 L requeridos)
Entregas disponibles: JUE (semana anterior), MAR (esta semana), JUE (esta semana)

Distribución automática inicial:
  JUE (21/05) — semana anterior:  30.000 L
  MAR (26/05) — esta semana:      35.000 L
  JUE (28/05) — esta semana:       0.000 L (no necesario más)

Total ingresado: 30 + 35 + 0 = 65 ✓
```

**Operación del usuario:** "Prefiero que TODO llegue el martes"
- Usuario edita MAR de 35 → 65 litros
- Sistema automáticamente:
  - JUE (21/05) → 0 litros (se restaron los 30)
  - MAR (26/05) → 65 litros (nuevamente)
  - Resultado: 0 + 65 + 0 = 65 ✓

**Operación alternativa:** "Agregar 10 más para stock de seguridad"
- Usuario edita MAR de 35 → 45 litros
- Sistema automáticamente:
  - JUE (21/05) → 20 litros (se restaron 10 de los 30)
  - MAR (26/05) → 45 litros (nuevamente)
  - JUE (28/05) → 0 litros (no cambia)
  - Resultado: 20 + 45 + 0 = 65 ✓

### Casos de Uso — Comportamiento Detallado

#### Caso 1: Usuario INCREMENTA con botón + (ESCENARIO INDEPENDIENTE)

```
Inicial:   JUE(sem-1): 30  |  MAR(sem-1): 35  |  JUE(sem-1): 0
           Total: 65

Usuario presiona +1 en JUE(sem-1) (botón +, click simple):
Result:    JUE(sem-1): 31  |  MAR(sem-1): 34  |  JUE(sem-1): 0
           Total: 65 ✓
           
Algoritmo:
  - delta = +1 (incremento de click simple)
  - Buscar siguiente día de entrega con cantidad > 0 → MAR (35)
  - Restar de MAR: 35 - 1 = 34
  - Resultado: JUE aumenta 1, MAR disminuye 1 (coherencia mantenida)
  - NUNCA negativo ✓
```

#### Caso 2: Usuario DISMINUYE con botón − (CONTINUACIÓN del Caso 1 — recuperación)

```
Estado actual:  JUE(sem-1): 31  |  MAR(sem-1): 34  |  JUE(sem-1): 0
                                         ↑ (fue restado en Caso 1)
Total: 65

Usuario presiona −1 en JUE(sem-1) (botón −, click simple):
Result:    JUE(sem-1): 30  |  MAR(sem-1): 35  |  JUE(sem-1): 0
           Total: 65 ✓

Algoritmo:
  - delta = −1 (disminución de click simple)
  - Buscar siguiente día de entrega → MAR
  - MAR fue restado anteriormente (34 < 35 original)
  - RECUPERAR: MAR pasa de 34 → 35
  - Resultado: Se deshace completamente el cambio del Caso 1
  - Recuperación selectiva: SOLO se recupera de lo que fue restado ✓
```

#### Caso 3: Usuario DISMINUYE MÁS ALLÁ del original (ESCENARIO INDEPENDIENTE — cascada a posteriores)

```
ESCENARIO DIFERENTE — ninguno ha sido restado aún:

Inicial:   JUE(sem-1): 30  |  MAR(sem-1): 35  |  JUE(sem-1): 0
           Total: 65
           (MAR está en su valor original, NO fue restado)

Usuario presiona −5 tres veces en JUE(sem-1) (botón −, click mantenido, 3 veces):
Result:    JUE(sem-1): 15  |  MAR(sem-1): 35  |  JUE(sem-1): 15
           Total: 65 ✓

Algoritmo (acumulado):
  - delta total = −15 (disminución de 3 clics mantenidos × 5)
  - Fase 1: Buscar días posteriores que FUERON restados
    → MAR no fue restado (sigue en 35 original)
    → NO hay qué recuperar de MAR
  - Fase 2: Transferir excedente a siguientes días disponibles
    → JUE(sem-1) última: 0 + 15 = 15
  - Resultado: Distribución se transfiere al próximo día de entrega
  - Recuperación selectiva: NO recupera de días no restados ✓
```

#### Caso 4: Usuario DIGITA directamente en input (SIN redistribución)

```
ESCENARIO INDEPENDIENTE:

Inicial:   JUE(sem-1): 30  |  MAR(sem-1): 35  |  JUE(sem-1): 0
           Total: 65 (Solicitado: 65)

Usuario DIGITA "15" directamente en JUE(sem-1):
Result:    JUE(sem-1): 15  |  MAR(sem-1): 35  |  JUE(sem-1): 0
           Total: 50 ⚠️ INCONSISTENTE

❌ NO se redistribuye automáticamente porque:
   - El usuario decide conscientemente reducir cantidad (stock extra, cancelación, etc.)
   - Reducir cantidad ≠ redistribuir entre días de entrega
   - Forzar redistribución causaría conflictos inesperados

✅ Indicador de inconsistencia:
   - Mostrar warning: "Total (50) ≠ Solicitado (65)" EN LA FILA del producto
   - Aparece columna "Acciones" con icono de sincronizar (↻)
   - Usuario puede opcionalmente presionar ↻ para restaurar solo ESTE producto a 65
   - O decidir mantener la reducción (es intencional, controlado por usuario)

✅ Restauración por fila:
   - SOLO restaura el producto actual (esa fila)
   - NO afecta otros productos de la tabla
   - Usuario controla si lo hace o no (decisión consciente)
```

### Implementación Requerida

**Ubicación:** `frontend/src/pages/gestion-proveedores.tsx`, componente `ProveedorCotizacionTabla`, función `EntregaInput`.

**Requisitos clave:**

1. **Dos modos de entrada en `EntregaInput`:**
   - Modo A: Botones ± (dispara redistribución automática)
     * **Click simple** (single tap): incrementa/decrementa de **1 en 1**
     * **Click mantenido** (long press): incrementa/decrementa de **5 en 5** con delay visual (~100-150ms) para permitir visualizar la incrementación controlada
   - Modo B: Input directo (permite cualquier valor, SIN redistribución)

2. **Validación de valores negativos:**
   - Cantidad NUNCA puede ser < 0
   - Botón − se deshabilita cuando valor === 0
   - Si se intenta digitar un valor negativo → rechazar, resetear a 0

3. **Columna "Acciones" — restauración por fila:**
   - Aparece dinámicamente EN CADA FILA (por producto) si: `total_entregas_producto ≠ cantidad_solicitada`
   - Icono: ↻ (sincronizar/restaurar)
   - Función: Restaurar SOLO ESE PRODUCTO a su distribución original (sin tocar otros productos)
   - Opcional: Usuario decide si restaura o mantiene la reducción intencional
   - Desaparece automáticamente cuando total === cantidad_solicitada

3. **Algoritmo de redistribución (solo con botones ±):**

```typescript
const handleEntregaIncrement = (idProveedor, idProducto, entregaKey, increment) => {
  // increment = +1, −1, +5, etc. (solo números, desde botones)
  
  const valorAnterior = ocCantidades[idProveedor][idProducto][entregaKey];
  const nuevoValor = valorAnterior + increment;
  
  // Validar no negativo
  if (nuevoValor < 0) {
    console.warn('Cantidad no puede ser negativa');
    return;
  }
  
  const delta = increment; // Positivo o negativo
  
  // Obtener índice del día de entrega actual en la lista de entregas
  const colSpecs = buildColsOC(diasEntrega, diasConQty);
  const indexActual = colSpecs.findIndex(c => getEntregaKey(c) === entregaKey);
  
  if (delta > 0) {
    // INCREMENTO: restar de días posteriores
    redistribuirRestandoEnCascada(
      idProveedor, 
      idProducto, 
      indexActual, 
      Math.abs(delta), 
      colSpecs
    );
  } else if (delta < 0) {
    // DISMINUCIÓN: primero recuperar restados, luego transferir en cascada
    redistribuirIncrementandoEnCascada(
      idProveedor, 
      idProducto, 
      indexActual, 
      Math.abs(delta), 
      colSpecs
    );
  }
  
  // Actualizar state con nuevo valor (incluyendo cambios en cascada)
  actualizarCantidadesRedistribuidas(...);
};

const handleEntregaDirectInput = (idProveedor, idProducto, entregaKey, valor) => {
  // Entrada directa desde input — NO redistribuir
  
  // Solo validar rango
  if (valor < 0) {
    console.warn('Cantidad no puede ser negativa');
    return;
  }
  
  // Actualizar estado SIN redistribución
  onCantidadChange(idProveedor, idProducto, entregaKey, valor);
  
  // Mostrar validación: si total ≠ solicitado, mostrar warning
  const totalEntregas = calcularTotalEntregas(idProveedor, idProducto);
  const totalSolicitado = calcularTotalSolicitado(idProveedor, idProducto);
  
  if (totalEntregas !== totalSolicitado) {
    showWarning(`Distribución inconsistente: ${totalEntregas} ≠ ${totalSolicitado}`);
  }
};
```

4. **Funciones auxiliares de redistribución:**

```typescript
const redistribuirRestandoEnCascada = (
  idProveedor, idProducto, indexActual, deltaAbsoluto, colSpecs
) => {
  // INCREMENTO: buscar siguientes días y restar en cascada
  let restante = deltaAbsoluto;
  
  for (let i = indexActual + 1; i < colSpecs.length && restante > 0; i++) {
    const col = colSpecs[i];
    const key = getEntregaKey(col);
    const cantidadActual = ocCantidades[idProveedor][idProducto][key] ?? 0;
    
    if (cantidadActual > 0) {
      const aRestar = Math.min(restante, cantidadActual);
      ocCantidades[idProveedor][idProducto][key] -= aRestar;
      restante -= aRestar;
    }
  }
  
  // Si restante > 0 aún, significa no hay suficiente en días posteriores
  if (restante > 0) {
    showWarning(`No hay suficiente cantidad en días posteriores para redistribuir (falta: ${restante})`);
    // Revertir cambio si es crítico, o permitir estado transitorio
  }
};

const redistribuirIncrementandoEnCascada = (
  idProveedor, idProducto, indexActual, deltaAbsoluto, colSpecs
) => {
  // DISMINUCIÓN: primero recuperar lo restado, luego transferir a posteriores
  let pendiente = deltaAbsoluto;
  
  // Fase 1: Recuperar lo que fue restado anteriormente (buscar hacia atrás)
  for (let i = indexActual + 1; i < colSpecs.length && pendiente > 0; i++) {
    const col = colSpecs[i];
    const key = getEntregaKey(col);
    const valorOriginal = ocCantidadesOriginales[idProveedor][idProducto][key] ?? 0;
    const valorActual = ocCantidades[idProveedor][idProducto][key] ?? 0;
    
    const restado = valorOriginal - valorActual; // Cantidad que fue restada
    if (restado > 0) {
      const aRecuperar = Math.min(pendiente, restado);
      ocCantidades[idProveedor][idProducto][key] += aRecuperar;
      pendiente -= aRecuperar;
    }
  }
  
  // Fase 2: Si aún hay pendiente, transferir a días posteriores
  if (pendiente > 0) {
    for (let i = indexActual + 1; i < colSpecs.length; i++) {
      const col = colSpecs[i];
      const key = getEntregaKey(col);
      ocCantidades[idProveedor][idProducto][key] += pendiente;
      break; // Transferir todo al siguiente día disponible
    }
  }
};
```

### Interfaz de Usuario — Componente EntregaInput Mejorado

**Cambios visuales:**
```tsx
// Antes (solo input numérico):
<EntregaInput value={45} onChange={handleChange} />

// Después (input + botones ±):
<div className="flex items-center gap-1">
  <button 
    className="px-1 py-0.5 text-xs bg-warning-100 hover:bg-warning-200" 
    onClick={() => handleEntregaChange(valor - 1)}  // Decremento unitario
    disabled={valor === 0}
  >
    −
  </button>
  <input 
    type="number" 
    value={45} 
    onChange={handleChange}  // Sigue soportando edición numérica directa
    className="w-20 px-2 py-1 text-center text-xs"
  />
  <button 
    className="px-1 py-0.5 text-xs bg-warning-100 hover:bg-warning-200" 
    onClick={() => handleEntregaChange(valor + 1)}  // Incremento unitario
  >
    +
  </button>
</div>
```

**Comportamiento:**
- **Botón `−`:** Decrementa en 1 unidad (o según step definido), redistribuye al siguiente día de entrega
- **Botón `+`:** Incrementa en 1 unidad, redistribuye desde el siguiente día
- **Input directo:** El usuario puede seguir tipando números; al perder el foco (onBlur) se ejecuta la redistribución
- **Validación visual:** Si hay distribución pendiente sin asignar (delta ≠ 0), mostrar banner de advertencia

### Restricciones y Validaciones

1. **No permitir cantidades negativas** — Los botones `−` se deshabilitan si `valor === 0`
2. **No permitir superar el total solicitado** — Mostrar error si `Σ(entregas) > cantidadTotal`
3. **Mantener coherencia de la distribución** — Después de cada cambio, verificar que `Σ(entregas) === cantidadTotal`
4. **Independencia por proveedor** — Las distribuciones de un proveedor no afectan a otros
5. **Independencia por producto** — Las distribuciones de un producto no afectan a otros productos del mismo proveedor

### Documentación de Cambios (para commit)

**Archivos a modificar:**
- `frontend/src/pages/gestion-proveedores.tsx`
  - Expandir `EntregaInput` component con botones ±
  - Reescribir `handleCantidadChange()` (en `ProveedorCotizacionTabla`) con lógica de redistribución
  - Agregar función auxiliar `redistribuirCantidades()` para encapsular la lógica
  - Agregar validaciones y tooltips de ayuda

**Tests sugeridos (caso de Vitest):**
- Caso: aumentar cantidad en día A → se resta del día B
- Caso: disminuir cantidad en día A → se suma al día B
- Caso: múltiples días de entrega → redistribución en cascada
- Caso: botones ± con límites (no ir negativo)
- Caso: productos fraccionarios vs enteros (precisión numérica)

---

## 13. PLAN DE PERSISTENCIA FUTURA (Fase 2)

### Backend: Endpoint POST para Crear Orden Pedido

```java
@PostMapping("/api/v1/orden-pedido")
public ResponseEntity<IOrdenPedidoCreada> crearOrdenPedido(
    @RequestBody @Valid OrdenPedidoCreateDTO request
) throws GestionProveedorException;
```

**Lógica del servicio (pseudocódigo):**
```
1. Validar: idPedido existe, APROBADO, idProveedor activo
2. CREATE orden_pedido { id_pedido, id_proveedor, fecha_creacion, observaciones, activo=true }
3. Para cada distribución en request:
   a. calcularCantidadTotal = SUM(cantidad de todas las distribuciones de ese producto)
   b. CREATE detalle_orden_pedido {
       id_orden_pedido (del paso 2),
       id_producto,
       cantidad_solicitada = calcularCantidadTotal,
       precio_neto_unitario = (snapshot de proveedor_producto),
       precio_con_iva_unitario = snapshot,
       activo = true
      }
   c. Para cada distribución:
      CREATE entrega_orden_pedido {
        id_detalle_oc (del paso 3b),
        dia_semana,
        semana_anterior,
        cantidad
      }
4. Retornar detalle completo de la OC creada
```

**Una OP por proveedor** — El POST se invoca una sola vez por cada proveedor seleccionado en el cotizador.
Ejemplo: si hay 3 proveedores, se hacen 3 POSTs secuenciales, cada uno con sus `idProducto[]` y distribuciones.

### Frontend: Botón "Confirmar Orden Pedido"

Ubicación: Paso 2 del modal OrdenPedidoModal (línea ~4850 en `gestion-proveedores.tsx`)

```tsx
[Botón "Confirmar Orden Pedido"]
└── Al hacer click:
    1. Para cada proveedor en ocCotizacion.cotizacion (con idProveedor != null):
       a. Construir distribuciones desde cantidadesProv[idProveedor]
       b. Llamar crearOrdenPedidoService({ idPedido, idProveedor, distribuciones })
       c. Mostrar Toast de éxito
       d. Si hay error, mostrar Toast + no cierra modal
    2. Si todos los POSTs tuvieron éxito:
       - Cerrar modal
       - Refrescar tabla de proveedores (refetch)
       - Mostrar mensaje "Se crearon N órdenes de pedido"
```

### Vista Excel (Futuro — Fase 3)

**Endpoint (a implementar):**
```
GET /api/v1/orden-pedido/{id}/excel
Retorna: archivo .xlsx descargable con:
  - Encabezado: Proveedor, fecha creación, período de pedido
  - Tabla: Producto | U/M | Cant.Total | Entrega Jue (20,5 kg) | Entrega Mar (24,5 kg) | P.Neto unit. | P.con IVA unit. | Subtotal Neto | Subtotal IVA
  - Pie: Total Neto | Total IVA | Fecha de impresión
```

---

## REFERENCIAS CRUZADAS A OTROS MÓDULOS

| Módulo | Archivo | Línea | Descripción |
|--------|---------|-------|-------------|
| **gestion_inventario** | `gestion_inventario/entity/Producto.java` | — | FK a `detalle_orden_pedido.id_producto` |
| **gestion_inventario** | `gestion_inventario/entity/Categoria.java` | — | Categoría de los productos |
| **gestion_inventario** | `gestion_inventario/entity/UnidadMedida.java` | — | U/M de los productos |
| **gestion_proveedor** | `gestion_proveedor/entity/Proveedor.java` | — | FK a `orden_pedido.id_proveedor` |
| **gestion_proveedor** | `gestion_proveedor/entity/ProveedorProducto.java` | — | Snapshot de precios en `detalle_orden_pedido` |
| **gestion_proveedor** | `gestion_proveedor/entity/ProveedorDiaEntrega.java` | — | Consulta dinámica de días de entrega en runtime |
| **gestion_pedido** | `gestion_pedido/entity/Pedido.java` | — | FK a `orden_pedido.id_pedido` |
| **gestion_pedido** | `gestion_pedido/entity/PedidoSolicitud.java` | — | Relación con `pedido_solicitud` en la CTE |
| **gestion_solicitud** | `gestion_solicitud/entity/Solicitud.java` | — | Estado `EN_PEDIDO` en la query consolidada |
| **gestion_solicitud** | `gestion_solicitud/entity/ReservaSala.java` | — | Día de la semana de la solicitud |
| **gestion_solicitud** | `gestion_solicitud/entity/DetalleSolicitud.java` | — | Cantidad por producto en las solicitudes |

---

## RESUMEN DE ESTADO

| Componente | Estado | Fecha | Notas |
|-----------|--------|-------|-------|
| **BD — Tablas `orden_pedido` + `detalle_orden_pedido`** | ✅ Implementado | 2026-05-20 | Ubicadas en ConexionXD_v2.sql línea ~745 |
| **BD — Índices** | ✅ Implementado | 2026-05-20 | `idx_op_pedido`, `idx_op_proveedor`, `idx_dop_orden` |
| **Entidades Java** | ✅ Implementado | 2026-05-20 | `OrdenPedido.java`, `DetalleOrdenPedido.java` |
| **Repositorios** | ✅ Implementado | 2026-05-20 | Métodos de consulta básicos |
| **Service — Paso 1** | ✅ Implementado | 2026-05-20 | `listarPedidosSemana()` |
| **Service — Paso 2** | ✅ Implementado | 2026-05-20 | `obtenerCotizacionConsolidada()` |
| **Endpoint — Paso 1** | ✅ Implementado | 2026-05-20 | `GET /api/v1/orden-pedido/pedidos-semana` |
| **Endpoint — Paso 2** | ✅ Implementado | 2026-05-20 | `GET /api/v1/orden-pedido/cotizacion-consolidada` |
| **Frontend — Tipos** | ✅ Implementado | 2026-05-20 | `IPedidoSemanaResumen`, `ICotizacionConsolidadaResponse`, etc. |
| **Frontend — Servicios** | ✅ Implementado | 2026-05-20 | `obtenerPedidosSemanaService()`, `obtenerCotizacionConsolidadaService()` |
| **Frontend — Modal Paso 1** | ✅ Implementado | 2026-05-20 | Selección de pedidos de la semana |
| **Frontend — Modal Paso 2** | ✅ Implementado | 2026-05-20 | Cotización consolidada con edición de cantidades |
| **Lógica de Entregas (Prospectiva)** | ✅ Implementado | 2026-05-21 | `buildColsOC()`, `construirCantidades()`, `fechaExactaEntrega()` |
| **Tabla `entrega_orden_pedido`** | ⏳ Pendiente | — | Fase 2 — persistencia de distribuciones |
| **Endpoint POST** | ⏳ Pendiente | — | Fase 2 — crear orden pedido |
| **Vista Excel** | ⏳ Pendiente | — | Fase 3 — descarga del documento |

---

**Documento finalizado 2026-05-25**
**Referencia original:** `CONTEXTO_PROVEEDORES.MD` secciones 18, 13.10, 13.12, 20
