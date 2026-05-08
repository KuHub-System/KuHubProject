# Plan: Filtro por Asignatura en Pedido Semanal a Bodega - Backend

**Fecha**: 2026-05-08  
**Estado**: Planificación (sin ejecutar)  
**Objetivo**: Agregar capacidad de filtrado por `id_asignatura` en las queries backend para agrupar/filtrar datos según la asignatura seleccionada

---

## 1. CONTEXTO

El selector de asignatura ya se mostró en el frontend (pedido-semanal-a-bodega.tsx, líneas 1783-1834).
Ahora se necesita que el backend pueda filtrar los pedidos semanales por la asignatura seleccionada.

**Entidad**: `PedidoSemanaBodega` (línea 24 del entity: `private Integer idAsignatura;`)  
**Tabla BD**: `pedido_semana_bodega` columna `id_asignatura` (nullable)

---

## 2. QUERIES ACTUALES Y NECESARIAS

### 2.1 Queries actuales SIN filtro de asignatura

| Método | Ruta (futura) | Query actual |
|--------|---|---|
| `findAllWithDetailsPaging` | `GET /api/v1/pedido-semana-bodega` | Líneas 28-58: Solo filtra por `activo = true` |
| `findAllWithDetailsPagingByIdSemana` | `GET /api/v1/pedido-semana-bodega/by-semana/{idSemana}` | Líneas 61-92: Filtra por `activo = true` + `id_semana` |
| `findAllWithDetailsAndSearch` | `GET /api/v1/pedido-semana-bodega/search` | Líneas 104-137: Filtra por nombre/descripción |
| `findAllWithDetailsAndSearchByIdSemana` | `GET /api/v1/pedido-semana-bodega/search/by-semana` | Líneas 140-174: Filtra por búsqueda + semana |

### 2.2 Nuevos métodos necesarios

Se deben agregar **8 nuevos métodos** al repositorio para soportar filtro por `id_asignatura`:

#### A. Filtro solo por asignatura (sin búsqueda)

```
1. findAllWithDetailsPagingByIdAsignatura(idAsignatura, limit, offset)
   - Query: WHERE p.activo = true AND p.id_asignatura = :idAsignatura
   - Count: countByActivoTrueAndIdAsignatura(idAsignatura)

2. findAllWithDetailsPagingByIdSemanaAndIdAsignatura(idSemana, idAsignatura, limit, offset)
   - Query: WHERE p.activo = true AND p.id_semana = :idSemana AND p.id_asignatura = :idAsignatura
   - Count: countByActivoTrueAndIdSemanaAndIdAsignatura(idSemana, idAsignatura)
```

#### B. Filtro por asignatura + búsqueda

```
3. findAllWithDetailsAndSearchByIdAsignatura(term, idAsignatura, limit, offset)
   - Query: WHERE p.activo = true AND (ILIKE nombre/descripción) AND p.id_asignatura = :idAsignatura
   - Count: countWithSearchAndIdAsignatura(term, idAsignatura)

4. findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura(term, idSemana, idAsignatura, limit, offset)
   - Query: WHERE p.activo = true AND (ILIKE nombre/descripción) AND p.id_semana = :idSemana AND p.id_asignatura = :idAsignatura
   - Count: countWithSearchAndIdSemanaAndIdAsignatura(term, idSemana, idAsignatura)
```

---

## 3. ESPECIFICACIÓN DE QUERIES A AGREGAR

### 3.1 Método 1: findAllWithDetailsPagingByIdAsignatura

```java
/** Lista paginada de pedidos semana bodega activos filtrados por idAsignatura. */
@Query(value = """
    SELECT
        p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
        p.nombre_pedido_semana_bodega AS "nombrePedido",
        p.descripcion_pedido_semana_bodega AS "descripcionPedido",
        p.estado_pedido::text AS "estadoPedido",
        COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
        p.id_semana AS "idSemana",
        p.id_asignatura AS "idAsignatura",
        jsonb_agg(
            jsonb_build_object(
                'nombreProducto', pr.nombre_producto,
                'cantProducto', d.cant_producto,
                'abreviatura', u.abreviatura,
                'idDetallePedido', d.id_detalle_pedido_semana,
                'idProducto', pr.id_producto,
                'idUnidad', u.id_unidad,
                'observacion', d.observacion
            )
        ) AS "detallesJson"
    FROM pedido_semana_bodega p
    LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
    LEFT JOIN producto pr ON d.id_producto = pr.id_producto
    LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
    WHERE p.activo = true AND p.id_asignatura = :idAsignatura
    GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
    ORDER BY p.nombre_pedido_semana_bodega ASC
    LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsPagingByIdAsignatura(
        @Param("idAsignatura") Integer idAsignatura,
        @Param("limit") int limit,
        @Param("offset") int offset);
```

**Count correspondiente:**
```java
@Query(value = """
    SELECT COUNT(*) FROM pedido_semana_bodega
    WHERE activo = true AND id_asignatura = :idAsignatura
    """, nativeQuery = true)
long countByActivoTrueAndIdAsignatura(@Param("idAsignatura") Integer idAsignatura);
```

### 3.2 Método 2: findAllWithDetailsPagingByIdSemanaAndIdAsignatura

```java
/** Lista paginada de pedidos semana bodega activos filtrados por idSemana e idAsignatura. */
@Query(value = """
    SELECT
        p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
        p.nombre_pedido_semana_bodega AS "nombrePedido",
        p.descripcion_pedido_semana_bodega AS "descripcionPedido",
        p.estado_pedido::text AS "estadoPedido",
        COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
        p.id_semana AS "idSemana",
        p.id_asignatura AS "idAsignatura",
        jsonb_agg(
            jsonb_build_object(
                'nombreProducto', pr.nombre_producto,
                'cantProducto', d.cant_producto,
                'abreviatura', u.abreviatura,
                'idDetallePedido', d.id_detalle_pedido_semana,
                'idProducto', pr.id_producto,
                'idUnidad', u.id_unidad,
                'observacion', d.observacion
            )
        ) AS "detallesJson"
    FROM pedido_semana_bodega p
    LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
    LEFT JOIN producto pr ON d.id_producto = pr.id_producto
    LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
    WHERE p.activo = true AND p.id_semana = :idSemana AND p.id_asignatura = :idAsignatura
    GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
    ORDER BY p.nombre_pedido_semana_bodega ASC
    LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsPagingByIdSemanaAndIdAsignatura(
        @Param("idSemana") Integer idSemana,
        @Param("idAsignatura") Integer idAsignatura,
        @Param("limit") int limit,
        @Param("offset") int offset);
```

**Count correspondiente:**
```java
@Query(value = """
    SELECT COUNT(*) FROM pedido_semana_bodega
    WHERE activo = true AND id_semana = :idSemana AND id_asignatura = :idAsignatura
    """, nativeQuery = true)
long countByActivoTrueAndIdSemanaAndIdAsignatura(@Param("idSemana") Integer idSemana, @Param("idAsignatura") Integer idAsignatura);
```

### 3.3 Método 3: findAllWithDetailsAndSearchByIdAsignatura

```java
/** Lista paginada de pedidos semana bodega activos filtrados por búsqueda e idAsignatura. */
@Query(value = """
    SELECT
        p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
        p.nombre_pedido_semana_bodega AS "nombrePedido",
        p.descripcion_pedido_semana_bodega AS "descripcionPedido",
        p.estado_pedido::text AS "estadoPedido",
        COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
        p.id_semana AS "idSemana",
        p.id_asignatura AS "idAsignatura",
        jsonb_agg(
            jsonb_build_object(
                'nombreProducto', pr.nombre_producto,
                'cantProducto', d.cant_producto,
                'abreviatura', u.abreviatura,
                'idDetallePedido', d.id_detalle_pedido_semana,
                'idProducto', pr.id_producto,
                'idUnidad', u.id_unidad,
                'observacion', d.observacion
            )
        ) AS "detallesJson"
    FROM pedido_semana_bodega p
    LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
    LEFT JOIN producto pr ON d.id_producto = pr.id_producto
    LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
    WHERE p.activo = true
      AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
      AND p.id_asignatura = :idAsignatura
    GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
    ORDER BY p.nombre_pedido_semana_bodega ASC
    LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsAndSearchByIdAsignatura(
        @Param("term") String term,
        @Param("idAsignatura") Integer idAsignatura,
        @Param("limit") int limit,
        @Param("offset") int offset);
```

**Count correspondiente:**
```java
@Query(value = """
    SELECT COUNT(*) FROM pedido_semana_bodega
    WHERE activo = true
      AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
      AND id_asignatura = :idAsignatura
    """, nativeQuery = true)
long countWithSearchAndIdAsignatura(@Param("term") String term, @Param("idAsignatura") Integer idAsignatura);
```

### 3.4 Método 4: findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura

```java
/** Lista paginada de pedidos semana bodega activos filtrados por búsqueda, idSemana e idAsignatura. */
@Query(value = """
    SELECT
        p.id_pedido_semana_bodega AS "idPedidoSemanaBodega",
        p.nombre_pedido_semana_bodega AS "nombrePedido",
        p.descripcion_pedido_semana_bodega AS "descripcionPedido",
        p.estado_pedido::text AS "estadoPedido",
        COUNT(d.id_detalle_pedido_semana) AS "totalDetalles",
        p.id_semana AS "idSemana",
        p.id_asignatura AS "idAsignatura",
        jsonb_agg(
            jsonb_build_object(
                'nombreProducto', pr.nombre_producto,
                'cantProducto', d.cant_producto,
                'abreviatura', u.abreviatura,
                'idDetallePedido', d.id_detalle_pedido_semana,
                'idProducto', pr.id_producto,
                'idUnidad', u.id_unidad,
                'observacion', d.observacion
            )
        ) AS "detallesJson"
    FROM pedido_semana_bodega p
    LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = p.id_pedido_semana_bodega
    LEFT JOIN producto pr ON d.id_producto = pr.id_producto
    LEFT JOIN unidad_medida u ON u.id_unidad = pr.id_unidad
    WHERE p.activo = true
      AND (p.nombre_pedido_semana_bodega ILIKE %:term% OR p.descripcion_pedido_semana_bodega ILIKE %:term%)
      AND p.id_semana = :idSemana
      AND p.id_asignatura = :idAsignatura
    GROUP BY p.id_pedido_semana_bodega, p.nombre_pedido_semana_bodega, p.descripcion_pedido_semana_bodega, p.estado_pedido, p.id_semana, p.id_asignatura
    ORDER BY p.nombre_pedido_semana_bodega ASC
    LIMIT :limit OFFSET :offset
    """, nativeQuery = true)
List<PedidoSemanaBodegaWithDetailsView> findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura(
        @Param("term") String term,
        @Param("idSemana") Integer idSemana,
        @Param("idAsignatura") Integer idAsignatura,
        @Param("limit") int limit,
        @Param("offset") int offset);
```

**Count correspondiente:**
```java
@Query(value = """
    SELECT COUNT(*) FROM pedido_semana_bodega
    WHERE activo = true
      AND (nombre_pedido_semana_bodega ILIKE %:term% OR descripcion_pedido_semana_bodega ILIKE %:term%)
      AND id_semana = :idSemana
      AND id_asignatura = :idAsignatura
    """, nativeQuery = true)
long countWithSearchAndIdSemanaAndIdAsignatura(@Param("term") String term, @Param("idSemana") Integer idSemana, @Param("idAsignatura") Integer idAsignatura);
```

---

## 4. CAMBIOS EN EL SERVICIO

El `PedidoSemanaBodegaService` (interfaz) y `PedidoSemanaBodegaServiceImpl` necesitarán métodos wrapper que:
1. Llamen a los nuevos métodos del repositorio
2. Paginen los resultados
3. Retornen `PedidoSemanaBodegasPage` (el DTO de response)

Ejemplo de método nuevo en el servicio:
```java
// En la interfaz
@Transactional(readOnly = true)
PedidoSemanaBodegasPage getPedidosSemanalByIdAsignaturaPaginado(
    Integer idAsignatura,
    Integer page,
    Integer pageSize,
    Integer idSemana,
    String searchTerm
);

// En la implementación
@Override
@Transactional(readOnly = true)
public PedidoSemanaBodegasPage getPedidosSemanalByIdAsignaturaPaginado(
        Integer idAsignatura,
        Integer page,
        Integer pageSize,
        Integer idSemana,
        String searchTerm) {
    
    PaginationUtils.PagingResult pagingResult = PaginationUtils.getPagingResult(page, pageSize);
    
    List<PedidoSemanaBodegaWithDetailsView> data;
    long total;
    
    if (idSemana != null && searchTerm != null && !searchTerm.isEmpty()) {
        // Con búsqueda y semana
        data = pedidoSemanaBodegaRepository.findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura(
            searchTerm, idSemana, idAsignatura, pagingResult.limit(), pagingResult.offset());
        total = pedidoSemanaBodegaRepository.countWithSearchAndIdSemanaAndIdAsignatura(
            searchTerm, idSemana, idAsignatura);
    } else if (idSemana != null) {
        // Solo con semana
        data = pedidoSemanaBodegaRepository.findAllWithDetailsPagingByIdSemanaAndIdAsignatura(
            idSemana, idAsignatura, pagingResult.limit(), pagingResult.offset());
        total = pedidoSemanaBodegaRepository.countByActivoTrueAndIdSemanaAndIdAsignatura(
            idSemana, idAsignatura);
    } else if (searchTerm != null && !searchTerm.isEmpty()) {
        // Solo con búsqueda
        data = pedidoSemanaBodegaRepository.findAllWithDetailsAndSearchByIdAsignatura(
            searchTerm, idAsignatura, pagingResult.limit(), pagingResult.offset());
        total = pedidoSemanaBodegaRepository.countWithSearchAndIdAsignatura(
            searchTerm, idAsignatura);
    } else {
        // Solo asignatura
        data = pedidoSemanaBodegaRepository.findAllWithDetailsPagingByIdAsignatura(
            idAsignatura, pagingResult.limit(), pagingResult.offset());
        total = pedidoSemanaBodegaRepository.countByActivoTrueAndIdAsignatura(idAsignatura);
    }
    
    return PedidoSemanaBodegasPage.of(data, pagingResult, total);
}
```

---

## 5. CAMBIOS EN EL CONTROLADOR

El `PedidoSemanaBodegaController` necesitará una nueva ruta (o rutas) para filtrar por asignatura:

```java
/**
 * Obtiene pedidos semanales agrupados/filtrados por asignatura seleccionada.
 * ✅ Consumido por frontend: el selector de asignatura llamará esta ruta al cambiar.
 * 
 * Query Params:
 *   - idAsignatura: (requerido) ID de la asignatura para filtrar
 *   - idSemana: (opcional) ID de semana para filtro adicional
 *   - page: (opcional, default 1) Número de página
 *   - pageSize: (opcional, default 20) Registros por página
 *   - searchTerm: (opcional) Término de búsqueda por nombre/descripción
 */
@GetMapping("/by-asignatura")
public ResponseEntity<PedidoSemanaBodegasPage> getPedidosByAsignatura(
        @RequestParam Integer idAsignatura,
        @RequestParam(required = false) Integer idSemana,
        @RequestParam(defaultValue = "1") Integer page,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String searchTerm) {
    
    PedidoSemanaBodegasPage response = pedidoSemanaBodegaService.getPedidosSemanalByIdAsignaturaPaginado(
            idAsignatura, page, pageSize, idSemana, searchTerm);
    
    return ResponseEntity.status(200).body(response);
}
```

**Ruta**: `GET /api/v1/pedido-semana-bodega/by-asignatura?idAsignatura=5&page=1&pageSize=20`

---

## 6. CAMBIOS EN EL FRONTEND

El frontend (`pedido-semanal-a-bodega.tsx`) debe:

1. Escuchar el cambio del selector de asignatura
2. Llamar a la nueva ruta backend con el `idAsignaturaSeleccionada`
3. Actualizar la tabla con los datos filtrados

**Pseudo-código en el componente:**

```typescript
React.useEffect(() => {
    if (idAsignaturaSeleccionada) {
        // Llamar con filtro de asignatura
        cargarDatosConFiltroAsignatura(idAsignaturaSeleccionada);
    }
}, [idAsignaturaSeleccionada]);

// Nueva función en el servicio:
const cargarDatosConFiltroAsignatura = async (idAsignatura: string) => {
    try {
        const response = await obtenerPedidosFilterByAsignaturaService(
            parseInt(idAsignatura),
            filterIdSemana === 'todas' ? null : parseInt(filterIdSemana),
            1,  // page
            20, // pageSize
            searchTerm || null
        );
        setRecetas(response.data);
        setTotalPages(response.totalPaginas);
    } catch (error) {
        toast.error('Error al cargar pedidos filtrados');
    }
};
```

**Nueva función en `pedido-semanal-bodega-service.ts`:**

```typescript
export const obtenerPedidosFilterByAsignaturaService = async (
    idAsignatura: number,
    idSemana?: number | null,
    page?: number,
    pageSize?: number,
    searchTerm?: string | null
): Promise<IPedidoSemanaBodegaResponse> => {
    const params = new URLSearchParams();
    params.append('idAsignatura', idAsignatura.toString());
    if (idSemana) params.append('idSemana', idSemana.toString());
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('pageSize', pageSize.toString());
    if (searchTerm) params.append('searchTerm', searchTerm);
    
    const response = await api.get<IPedidoSemanaBodegaResponse>(
        `/pedido-semana-bodega/by-asignatura?${params.toString()}`
    );
    return response.data;
};
```

---

## 7. FLUJO COMPLETO

```
Frontend (selector de asignatura cambia)
    ↓
    setIdAsignaturaSeleccionada(nuevoId)
    ↓
    useEffect dispara
    ↓
    obtenerPedidosFilterByAsignaturaService(idAsignatura, idSemana?, page?, etc)
    ↓
Backend: GET /api/v1/pedido-semana-bodega/by-asignatura?idAsignatura=X&...
    ↓
    PedidoSemanaBodegaController.getPedidosByAsignatura()
    ↓
    PedidoSemanaBodegaService.getPedidosSemanalByIdAsignaturaPaginado()
    ↓
    Repositorio: findAllWithDetailsPagingByIdAsignatura() [+ otros según filtros]
    ↓
    Query SQL: WHERE p.activo = true AND p.id_asignatura = :idAsignatura [+ AND ...]
    ↓
    Retorna List<PedidoSemanaBodegaWithDetailsView>
    ↓
    Arma PedidoSemanaBodegasPage (paginado)
    ↓
    ResponseEntity.status(200).body(page)
    ↓
Frontend: recibe datos filtrados
    ↓
    setRecetas(response.data)
    ↓
    Tabla se redibuja con pedidos de esa asignatura solamente
```

---

## 8. CHECKLIST FINAL

- [ ] 8 nuevos métodos agregados a `PedidoSemanaBodegaRepository` (4 queries + 4 counts)
- [ ] 1 nuevo método en `PedidoSemanaBodegaService` (interfaz)
- [ ] 1 nuevo método en `PedidoSemanaBodegaServiceImpl` (implementación)
- [ ] 1 nueva ruta en `PedidoSemanaBodegaController` (`GET /by-asignatura`)
- [ ] Nueva ruta registrada en `SpringSecurityConfig` con el rol correcto
- [ ] 1 nueva función en `pedido-semanal-bodega-service.ts` (frontend)
- [ ] `useEffect` en el componente escucha cambios de `idAsignaturaSeleccionada`
- [ ] Tabla se redibuja con datos filtrados
- [ ] `nota_alcance` actualizado (Sección 3.14 Backend + Sección 5 IMPLEMENTADO)

