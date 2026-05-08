# CONTEXTO — Página de Solicitud de Insumos (Masiva)

**Archivo principal:** `frontend/src/pages/solicitud.tsx`
**Tipos:** `frontend/src/types/solicitud.types.ts`
**Backend:** `backend/src/main/java/KuHub/modules/gestion_solicitud/`

---

## 1. DESCRIPCIÓN GENERAL

La página **"Solicitud de Insumos"** permite a los profesores crear **solicitudes masivas** de insumos para sus clases prácticas. En una sola operación se generan múltiples solicitudes (una por sección seleccionada + bloque horario).

**Flujo:**
1. Profesor selecciona **asignatura** → **secciones** → **bloques horarios** → **semana** → **receta base**
2. Opcionalmente modifica cantidades de productos y agrega productos extras
3. Al enviar se crean N solicitudes (una por bloque seleccionado × sección)
4. El backend escala automáticamente las cantidades según los alumnos inscritos

---

## 2. FRONTEND — Componente Principal (`solicitud.tsx`)

### 2.1 Estructura del componente

**Página completa:** 1326 líneas (React + TypeScript)

**Partes principales:**

| Parte | Líneas | Función |
|------|--------|---------|
| Constantes y helpers | 55-167 | Feriados Chile, agrupación de horarios, cálculos de fechas |
| `AsigCard` (sub-componente) | 172-815 | Tarjeta colapsable por asignatura (secciones, semana, receta, items) |
| `SolicitudPage` (componente principal) | 821-1326 | Página con selector de período, lista de asignaturas, sidebar con resumen |

### 2.2 Estado local del formulario

Cada asignatura tiene un `AsigConfig`:

```typescript
interface AsigConfig {
  bloquesIds: Set<string>;        // Claves: "${secId}|${diaSemana}|${idSala}"
  semanaId: string;               // ID de semana seleccionada
  recetaId: string;               // ID de receta base
  items: ItemSolicitud[];          // Lista de productos (base + extras)
  observaciones: string;           // Texto libre (máx 600 chars)
  extraProductoId: string;         // Para agregar producto adicional
  extraCantidad: string;           // Cantidad del producto extra
}

interface ItemSolicitud {
  id: string;                      // ID del detalle de receta o generado
  nombre: string;                  // Nombre del producto
  cantidadBase: number;            // Cantidad para 20 porciones
  cantidad: number;                // Mostrado al usuario (igual a cantidadBase)
  unidad: string;                  // Unidad de medida (kg, L, un, etc.)
  esExtra: boolean;                // true = agregado manualmente, false = de receta
  esFraccionario: boolean;         // true = permite decimales
  activoProducto: boolean;         // true = producto disponible
  idProducto?: number;             // Setear solo para extras
  observacion?: string;            // Nota específica del item
}
```

### 2.3 Lógica de secciones y bloques

**Agrupación de horarios:**
- Cada sección tiene N horarios (asignados a `ReservaSala`)
- Los horarios se agrupan por `(diaSemana, idSala)` formando "bloques"
- Cada bloque se identifica con clave: `"${secId}|${diaSemana}|${idSala}"`
- Al enviar, se crea **una solicitud por bloque seleccionado** (no por sección)

**Selección en UI:**
- Checkbox a nivel sección: selecciona/deselecciona todos sus bloques
- Checkboxes individuales de bloque: permite selección granular
- Estado indeterminado cuando hay bloques parcialmente seleccionados

### 2.4 Receta base y modificaciones

**Flujo de receta:**

1. Usuario selecciona receta → se cargan items con `cantidadBase` de la receta
2. Usuario puede **editar cantidades** manualmente
3. Usuario puede **eliminar items** de la receta
4. Usuario puede **agregar items extras** (productos no en la receta)

**Cantidades:**
- **Base:** cantidad para 20 porciones (la que se envía al backend)
- **Mostrada:** igual a la base, sin multiplicar por alumnos
- **Backend escala:** multiplica por cantidad de alumnos inscritos en cada sección

**Items extras:**
- Se marcan con `esExtra: true` e `idProducto` (no `idDetallePedidoSemana`)
- Al enviar se envían como "nuevos" en el delta `deltas.nuevos`
- Se prefijan con `[ADICIONAL]` en la observación

### 2.5 Deltas (cambios sobre receta)

Cuando se envía una solicitud con una receta base, se calcula un delta:

```typescript
deltas: {
  eliminados: number[];              // IDs de detalles removidos
  modificados: [{
    idDetalleReceta: number;         // ID del detalle original
    cantProducto: number;            // Nueva cantidad (sin multiplicar)
    observacion?: string;            // Nueva observación si existe
  }];
  nuevos: [{
    idProducto: number;              // ID del producto agregado
    cantProducto: number;            // Cantidad base (20 porciones)
    observacion: string;             // Prefijado con [ADICIONAL]
  }];
}
```

### 2.6 Validación de feriados Chile

El componente calcula automáticamente si una clase cae en feriado:
- **Feriados fijos:** Año Nuevo, Día del Trabajo, etc.
- **Feriados variables:** Viernes Santo, Sábado Santo (cálculo de Pascua)
- Si es feriado: etiqueta amarilla, aviso visual

### 2.7 Resumen de envío (sidebar derecha)

Muestra en tiempo real:
- **Total de solicitudes** a crear (suma de bloques seleccionados)
- **Total de alumnos** (suma de inscritos × bloques por sección)
- Desglose por asignatura (secciones, alumnos, semana, receta)

Botones:
- **Enviar:** POST a `/api/v1/solicitud/generate-mass-solicitions`
- **Limpiar todo:** limpia toda la configuración

### 2.8 Modal de resultado

Después de enviar muestra:
- Número de **solicitudes creadas**
- Número de **detalles de solicitud calculados**
- Explicación: cada producto se multiplicó según alumnos inscritos

---

## 3. TIPOS (`solicitud.types.ts`)

### 3.1 Tipos del frontend (antiguo sistema)

⚠️ **NOTA:** Existen tipos antiguos `ISolicitud`, `ISolicitudCreacion`, etc. que NO se usan en `solicitud.tsx`. Están presentes pero desactualizados.

**No uses estos tipos para solicitudes masivas** — usa las interfaces locales en el componente.

### 3.2 Interfaces que podrían crearse si se necesitan

```typescript
// Tipos que el usuario podría solicitar crear:
export interface ISolicitudMasiva {
  idAsignatura: number;
  idSemana: number;
  idReceta?: number;
  observacion?: string;
  secciones: ISectionForMasive[];
  deltas?: IDeltaSolicitud;
}

export interface ISectionForMasive {
  idSeccion: number;
  cantInscritos: number;
  horarios: IHorarioSeleccionado[];
}
```

---

## 4. BACKEND — Controlador (`SolicitudController.java`)

### 4.1 Endpoint principal

```
POST /api/v1/solicitud/generate-mass-solicitions
Consumes: application/json
Produces: application/json
Status: 201 (Created)
```

**Entrada:**
```java
List<MassiveSolicitation> payloadList
```

**Salida:**
```java
ResultsMassSolicitationView {
  totalSolicitudes: Integer,
  totalDetalles: Integer
}
```

### 4.2 Otros endpoints relevantes

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/curses-by-solicitation` | Obtiene asignaturas con secciones y bloques activos |
| GET | `/recipes-with-details-by-solicitation` | Obtiene recetas activas con detalles |
| POST | `/find-solicitations-per-week` | Lista solicitudes de un rango de fechas |
| POST | `/order-for-consolidation` | Dashboard consolidado de solicitudes |
| PATCH | `/change-massive-status` | Cambio de estado masivo (Aceptar/Rechazar) |

### 4.3 Entity — `Solicitud.java`

```java
@Entity
@Table(name = "solicitud")
public class Solicitud {
  @Id @GeneratedValue Integer idSolicitud;
  @Column LocalDate fechaSolicitada;
  @ManyToOne Usuario usuarioGestor;
  @ManyToOne Seccion seccion;
  @ManyToOne PedidoSemanaBodega receta;       // null si sin receta base
  @ManyToOne ReservaSala reservaSala;         // null según regla de negocio
  @Column LocalDateTime fechaRegistro;
  @Column String observaciones;
  @Enumerated EstadoSolicitud estadoSolicitud;
  @OneToMany(cascade=ALL) List<DetalleSolicitud> detalles;
  
  // Métodos helper:
  void setIdUsuarioGestorSolicitud(Integer id);
  void setIdSeccion(Integer id);
  void setIdReceta(Integer id);
  void addDetalle(DetalleSolicitud detalle);
}

public enum EstadoSolicitud {
  PENDIENTE,           // Estado inicial
  ACEPTADA,           // Aprobada sin cambios
  // ... más estados
}
```

### 4.4 Entity — `DetalleSolicitud.java`

(Tabla `detalle_solicitud`)

Cada solicitud tiene N detalles (uno por producto solicitado).

---

## 5. SERVICIO — `solicitud-service.ts` (Frontend)

### 5.1 Servicios principales

```typescript
// Obtener asignaturas con secciones y bloques
obtenerCursosParaSolicitudService(): Promise<IAsignaturaCurso[]>
  → GET /api/v1/solicitud/curses-by-solicitation

// Obtener recetas con detalles
obtenerRecetasSolicitudService(): Promise<IPedidoSemanaBodegaSolicitud[]>
  → GET /api/v1/solicitud/recipes-with-details-by-solicitation

// Obtener productos disponibles para extras
obtenerProductosOpcionService(): Promise<IProductoOpcion[]>
  → GET /api/v1/producto-opcion

// Generar solicitudes masivas
generarSolicitudesMasivasService(payload: ...[]): Promise<IResultsMassSolicitation>
  → POST /api/v1/solicitud/generate-mass-solicitions
```

---

## 6. FLUJO COMPLETO — De UI a Backend

### Paso 1: Profesor selecciona asignatura, secciones, bloques

```
UI: User clicks checkbox en AsigCard
→ onToggleBloque() → updateConfig() → estado.bloquesIds.add("${secId}|${dia}|${sala}")
```

### Paso 2: Profesor selecciona semana y receta

```
UI: User selects <Select>
→ handleSelectReceta() → config.recetaId = "123" → carga items de receta
```

### Paso 3: Profesor modifica items (opcional)

```
UI: User edits cantidad input / adds extra product
→ actualizarCantidad() / agregarExtra()
→ config.items actualizado
```

### Paso 4: Profesor envía

```
UI: Click "Enviar"
→ enviar() function
  1. Calcula payload: resumen.asigConfiguradas.map(...)
     - Para cada asignatura configurada:
       - Lee receta original y compara con items actuales
       - Calcula delta { eliminados, modificados, nuevos }
       - Crea entrada de secciones (una por bloque seleccionado)
  2. POST a /generate-mass-solicitions con Array<MassiveSolicitation>
  3. Recibe ResultsMassSolicitationView
  4. Muestra modal de éxito con totales
```

### Paso 5: Backend procesa

```
Backend: SolicitudController.generarSolicitudesMasivas()
→ SolicitudService.saveMass(payloadList)
  1. Para cada MassiveSolicitation:
     - Obtiene Asignatura, Semana, PedidoSemanaBodega (si existe)
     - Para cada sección:
       - Para cada horario en el bloque:
         - Crea nueva Solicitud(usuario, seccion, semana, receta, observaciones)
         - Agrega detalles según delta o items ingresados
         - Multiplica cantidades por cant_inscritos de la sección
         - Persiste
  2. Retorna { totalSolicitudes, totalDetalles }
```

---

## 7. PUNTOS CLAVE PARA MODIFICACIONES

### 7.1 Validaciones presentes

- ✅ Máximo 600 caracteres en observaciones (contador real)
- ✅ Máximo 100 caracteres por observación de item
- ✅ Validación de cantidades: no negativas, decimales solo si `esFraccionario`
- ✅ Validación de semana: solo futuras (≥ hoy)
- ✅ Detección de feriados Chile automática
- ✅ Indicador visual de sincronización período global ↔ filtros locales en receta

### 7.2 Estados visuales

| Estado | Indicador | Color |
|--------|-----------|-------|
| Válida (lista para enviar) | Punto verde + Border verde | `border-success-200` |
| Parcial (faltan datos) | Punto naranja + Border naranja | `border-warning-200` |
| Vacía | Punto gris | `border-default-200` |

### 7.3 Componentes HeroUI usados

- `Card`, `CardHeader`, `CardBody`, `CardFooter`
- `Button`, `Select`, `Checkbox`, `Textarea`, `Input`
- `Autocomplete`, `Chip`, `Divider`
- `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `Spinner`
- Framer Motion para animaciones de colapso

### 7.4 Iconos (Iconify + lucide)

Todos los íconos usan prefijo `lucide:` (book-open, users, calendar, etc.)

---

## 8. DATOS CLAVE

### 8.1 Interfaces de entrada desde backend

```typescript
interface IAsignaturaCurso {
  idAsignatura: number;
  nombreAsignatura: string;
  secciones: ISeccionCurso[];
}

interface ISeccionCurso {
  id_seccion: number;
  nombre_seccion: string;
  nombre_docente: string;
  cant_inscritos: number;
  capacidad_max: number;
  id_usuario: number;
  horarios: IHorarioCurso[];
  solicitudes?: string[];  // Fechas ya con solicitud registrada
}

interface IHorarioCurso {
  idReservaSala: number;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  idSala: number;
  nombreSala: string;
}

interface IPedidoSemanaBodegaSolicitud {
  idReceta: number;
  nombreReceta: string;
  detalles: [{
    idDetallePedidoSemana: number;
    nombreProducto: string;
    cantProducto: number;
    abreviatura: string;
    esFraccionario: boolean;
    activo: boolean;
    observacion?: string;
  }];
}

interface ISemana {
  idSemana: number;
  nombreSemana: string;
  fechaInicio: string;  // YYYY-MM-DD
  fechaFin: string;     // YYYY-MM-DD
}
```

### 8.2 Payload de envío (MassiveSolicitation)

```typescript
interface MassiveSolicitation {
  idAsignatura: number;
  idSemana: number;
  idReceta?: number;
  observacion?: string;
  secciones: [{
    idSeccion: number;
    idUsuario: number;
    cantInscritos: number;
    horarios: [{
      idReservaSala: number;
      fechaSolicitadaCalculada: string;  // YYYY-MM-DD
    }];
  }];
  deltas?: {
    eliminados: number[];
    modificados: [{
      idDetalleReceta: number;
      cantProducto: number;
      observacion?: string;
    }];
    nuevos: [{
      idProducto: number;
      cantProducto: number;
      observacion: string;
    }];
  };
}
```

---

## 9. VARIABLES Y HOOKS IMPORTANTES

### 9.1 Estados principales en SolicitudPage

```typescript
// Contexto global de período y semana
const { periodos, semanas, periodo, semanaId, defaultSemanaId, isLoading, seleccionarPeriodo, seleccionarSemana } 
  = usePeriodoSemana();

// Estados locales
const [asignaturas, setAsignaturas] = useState<IAsignaturaCurso[]>([]);
const [recetas, setRecetas] = useState<IPedidoSemanaBodegaSolicitud[]>([]);
const [productos, setProductos] = useState<IProductoOpcion[]>([]);
const [configs, setConfigs] = useState<Map<string, AsigConfig>>(new Map());
const [expanded, setExpanded] = useState<Set<string>>(new Set());  // Tarjetas abiertas
const [isSubmitting, setIsSubmitting] = useState(false);
const [sendResult, setSendResult] = useState<IResultsMassSolicitation | null>(null);

// Permisos
const { canCreate: soli_Crear } = useModulePermission('SOLICITUD');
const { isAdmin } = usePermission();
```

### 9.2 Métodos principales

```typescript
// Obtener o crear config de asignatura
getConfig(asigId: string): AsigConfig

// Actualizar config con función reducer
updateConfig(asigId: string, fn: (prev) => AsigConfig): void

// Alternar expansión de tarjeta
toggleExpand(id: string): void

// Alternar bloque individual
toggleBloque(secId, dia, idSala): void

// Alternar sección completa
toggleSeccion(sec: ISeccionCurso): void

// Alternar todas las secciones
toggleAll(): void

// Seleccionar receta y cargar items
handleSelectReceta(recetaId: string): void

// Actualizar cantidad de item
actualizarCantidad(itemId, val, esFraccionario): void

// Agregar producto extra
agregarExtra(): void

// Calcular resumen global
resumen: { totalSolicitudes, totalAlumnos, asigConfiguradas[] }

// Enviar solicitudes
enviar(): Promise<void>
```

---

## 10. PENDIENTES / NOTAS DE NEGOCIO

- [ ] **Receta sin seleccionar:** Si no hay receta, solo se pueden agregar productos extras manualmente (sin deltas)
- [ ] **Sincronización período:** Selector global de período en el header debe actualizarse al cambiar, eso resetea los filtros locales de receta
- [ ] **Validación de conflictos:** Si dos bloques de la misma sección se solapan, el frontend lo detecta pero el backend también debe validar
- [ ] **Recálculo de cantidades:** El backend multiplica por `cant_inscritos` de cada sección, asegurando proporcionalidad

---

## 11. ARCHIVOS RELACIONADOS

| Archivo | Función |
|---------|---------|
| `frontend/src/services/solicitud-service.ts` | Servicios HTTP |
| `frontend/src/types/solicitud.types.ts` | Tipos (desactualizados pero presentes) |
| `frontend/src/hooks/usePageTitle.ts` | Hook para título de página |
| `frontend/src/hooks/useToast.ts` | Notificaciones y confirmaciones |
| `frontend/src/contexts/permission-context.tsx` | Validación de permisos |
| `frontend/src/contexts/periodo-semana-context.tsx` | Contexto global de período/semana |
| `backend/src/main/java/.../gestion_solicitud/` | Módulo completo de backend |
| `backend/src/main/java/.../gestion_academica/` | Módulo de académica (Asignatura, Seccion, Semana) |

---

# 12. ⚡ MODIFICACIÓN REQUERIDA — Filtro de Asignatura en Pedidos Semanales Bodega

**Nota requerida:** `ejecutar_ahora`

## Objetivo

Agregar un **checkbox** en `AsigCard` que permita:
- ☑️ **Activado (por defecto):** Cargar Pedidos Semanales Bodega filtrados por `id_asignatura` de la asignatura actual
- ☐ **Desactivado:** Cargar todos los Pedidos Semanales Bodega disponibles del sistema

El **label debe cambiar** dinámicamente al hacer clic.

---

## 12.1 Endpoints Involucrados

### Backend — Pedidos Semanales Bodega filtrados por asignatura

**Endpoint actual:**
```
POST /api/v1/pedido-semana-bodega/find-all-recipes-pagined/{page}
```

**Parámetros soportados:**
```
@RequestParam(required = false) Integer idSemana
@RequestParam(required = false) Integer idAsignatura
```

**Implementación:** `PedidoSemanaBodegaController.java` línea 42-50

**Servicio:** `PedidoSemanaBodegaService.findAllRecipesPaginated(page, idSemana, idAsignatura)` (obtiene Pedidos Semanales Bodega)

### Frontend — Endpoint actual en solicitud

**Endpoint usado actualmente:**
```
GET /api/v1/solicitud/recipes-with-details-by-solicitation
```

**Ubicación:** `frontend/src/services/solicitud-service.ts` línea 68-70

**Función:** `obtenerRecetasSolicitudService()` (obtiene Pedidos Semanales Bodega)

**Problema actual:** No soporta filtros por `idAsignatura` — carga TODOS los Pedidos Semanales Bodega siempre.

---

## 12.2 Cambios Requeridos

### 1️⃣ Backend — MODIFICAR el método existente (NO crear nuevo)

**Endpoint EXISTENTE que se modifica:**
```
GET /api/v1/solicitud/recipes-with-details-by-solicitation
```

**Cambio:** Agregar parámetro opcional `idAsignatura` al endpoint

**Archivo:** `backend/src/main/java/KuHub/modules/gestion_solicitud/controller/SolicitudController.java`

**Línea 58 — Modificar:**

```java
// ANTES:
@GetMapping("/recipes-with-details-by-solicitation")
public ResponseEntity<List<RecipeSolicitation>> findActiveRecipesWithDetails() {
    return ResponseEntity
            .status(200)
            .body(solicitudService.findActiveRecipesWithDetailsRaw());
}

// DESPUÉS:
@GetMapping("/recipes-with-details-by-solicitation")
public ResponseEntity<List<RecipeSolicitation>> findActiveRecipesWithDetails(
        @RequestParam(required = false) Integer idAsignatura) {
    return ResponseEntity
            .status(200)
            .body(solicitudService.findActiveRecipesWithDetailsRaw(idAsignatura));
}
```

### 2️⃣ Backend — MODIFICAR método existente en Service

**Archivo:** `backend/src/main/java/KuHub/modules/gestion_solicitud/service/SolicitudService.java`

**Línea ~110 — Cambiar firma del método:**

```java
// ANTES:
List<RecipeSolicitation> findActiveRecipesWithDetailsRaw();

// DESPUÉS:
List<RecipeSolicitation> findActiveRecipesWithDetailsRaw(Integer idAsignatura);
```

**Archivo:** `backend/src/main/java/KuHub/modules/gestion_solicitud/service/SolicitudServiceImp.java`

**Línea ~110 — Modificar implementación:**

```java
// ANTES:
@Transactional(readOnly = true)
@Override
public List<RecipeSolicitation> findActiveRecipesWithDetailsRaw() {
    List<Object[]> rawResults = solicitudRepository.findActiveRecipesWithDetailsRaw();
    // ... resto del código
}

// DESPUÉS:
@Transactional(readOnly = true)
@Override
public List<RecipeSolicitation> findActiveRecipesWithDetailsRaw(Integer idAsignatura) {
    List<Object[]> rawResults = solicitudRepository.findActiveRecipesWithDetailsRaw(idAsignatura);
    // ... resto del código (igual)
}
```

### 3️⃣ Backend — MODIFICAR consulta en Repository

**Archivo:** `backend/src/main/java/KuHub/modules/gestion_solicitud/repository/SolicitudRepository.java`

**Línea ~95-123 — Cambiar la consulta SQL:**

```java
// ANTES:
@Query(value = """
    SELECT 
        r.id_pedido_semana_bodega AS idReceta,          -- [0]
        r.nombre_pedido_semana_bodega AS nombreReceta,  -- [1]
        ... [JSONB detalles] ...                         -- [2]
        r.id_semana AS idSemana                          -- [3]
    FROM pedido_semana_bodega r
    LEFT JOIN detalle_pedido_semana_bodega d ON ...
    LEFT JOIN producto p ON ...
    LEFT JOIN unidad_medida u ON ...
    WHERE r.activo = true
    AND r.estado_pedido = 'ACTIVO'
    GROUP BY ...
    ORDER BY ...
""", nativeQuery = true)
List<Object[]> findActiveRecipesWithDetailsRaw();

// DESPUÉS:
@Query(value = """
    SELECT 
        r.id_pedido_semana_bodega AS idReceta,          -- [0]
        r.nombre_pedido_semana_bodega AS nombreReceta,  -- [1]
        ... [JSONB detalles] ...                         -- [2]
        r.id_semana AS idSemana                          -- [3]
    FROM pedido_semana_bodega r
    LEFT JOIN detalle_pedido_semana_bodega d ON ...
    LEFT JOIN producto p ON ...
    LEFT JOIN unidad_medida u ON ...
    WHERE r.activo = true
    AND r.estado_pedido = 'ACTIVO'
    AND (r.id_asignatura = :idAsignatura OR :idAsignatura IS NULL)
    GROUP BY ...
    ORDER BY ...
""", nativeQuery = true)
List<Object[]> findActiveRecipesWithDetailsRaw(@Param("idAsignatura") Integer idAsignatura);
```

**Explicación del cambio en WHERE:**
- Si `idAsignatura = 5` → muestra solo Pedidos Semanales Bodega donde `r.id_asignatura = 5`
- Si `idAsignatura = null` → muestra TODOS (porque `NULL IS NULL = true`)

### 4️⃣ Frontend — Actualizar llamada al servicio (MISMO endpoint, con parámetro)

**Archivo:** `frontend/src/services/solicitud-service.ts`

**Línea 68-70 — Modificar:**

```typescript
// ANTES:
export const obtenerRecetasSolicitudService = async (): Promise<IPedidoSemanaBodegaSolicitud[]> => {
  const response = await api.get<IPedidoSemanaBodegaSolicitud[]>('/solicitud/recipes-with-details-by-solicitation');
  return response.data;
};

// DESPUÉS:
export const obtenerRecetasSolicitudService = async (
  idAsignatura?: number
): Promise<IPedidoSemanaBodegaSolicitud[]> => {
  const url = idAsignatura 
    ? `/solicitud/recipes-with-details-by-solicitation?idAsignatura=${idAsignatura}`
    : '/solicitud/recipes-with-details-by-solicitation';
  const response = await api.get<IPedidoSemanaBodegaSolicitud[]>(url);
  return response.data;
};
```

### 5️⃣ Frontend — Agregar checkbox en AsigCard

**Archivo:** `frontend/src/pages/solicitud.tsx`

**Ubicación:** Dentro del `AsigCard` component (línea ~195), agregar estado:

```typescript
const [soloEstaAsignatura, setSoloEstaAsignatura] = React.useState(true);
```

**UI en sección RECETA** (línea ~541, después del título "Pedido Semanal Base"):

```tsx
{/* Checkbox: Mostrar recetas de esta asignatura vs todas */}
<div className="mb-3 flex items-center gap-2">
  <Checkbox 
    isSelected={soloEstaAsignatura}
    onValueChange={setSoloEstaAsignatura}
    size="sm"
  >
    <span className="text-xs font-medium text-default-600">
      {soloEstaAsignatura 
        ? `Mostrar Pedidos de ${asig.nombreAsignatura}`
        : 'Mostrar todos los Pedidos disponibles'
      }
    </span>
  </Checkbox>
</div>
```

**Cambiar llamada al servicio:** En el `useEffect` donde se cargan recetas (buscar `obtenerRecetasSolicitudService()`), reemplazar con:

```typescript
// ANTES:
const recetasData = await obtenerRecetasSolicitudService();

// DESPUÉS:
const recetasData = await obtenerRecetasSolicitudService(
  soloEstaAsignatura ? asig.idAsignatura : undefined
);
```

**Agregar dependencia en useEffect:**

```typescript
// Agregar soloEstaAsignatura a las dependencias
React.useEffect(() => {
  // ... cargar recetas ...
}, [soloEstaAsignatura, asig.idAsignatura]);  // ← agregar estas dependencias
```

---

## 12.3 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│ AsigCard (usuario hace clic en checkbox)                    │
├─────────────────────────────────────────────────────────────┤
│ soloEstaAsignatura = true (por defecto)                     │
│ ↓                                                            │
│ Llamar: obtenerRecetasSolicitudConFiltroService(            │
│   asig.idAsignatura  // = 5 (ID de la asignatura)           │
│ )                                                            │
│ ↓                                                            │
│ Frontend URL: GET /solicitud/recipes-with-details...?id=5   │
│ ↓                                                            │
│ Backend: SolicitudController.findActiveRecipesWithDetails... │
│ ↓                                                            │
│ Backend: SolicitudService.findActiveRecipesWithDetailsFiltered(5)
│ ↓                                                            │
│ Query: WHERE asignatura.id_asignatura = 5 OR NULL          │
│ ↓                                                            │
│ Retorna: [receta1, receta2, receta3]  (solo de esa asig)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Usuario desactiva checkbox                                  │
├─────────────────────────────────────────────────────────────┤
│ soloEstaAsignatura = false                                  │
│ ↓                                                            │
│ Llamar: obtenerRecetasSolicitudConFiltroService()           │
│ (sin idAsignatura)                                          │
│ ↓                                                            │
│ Frontend URL: GET /solicitud/recipes-with-details          │
│ ↓                                                            │
│ Backend: findActiveRecipesWithDetailsRaw(null)             │
│ ↓                                                            │
│ Query: SELECT * FROM pedidos WHERE activo = true           │
│ ↓                                                            │
│ Retorna: [pedido1, pedido2, pedido3, ..., pedido99]        │
│ (TODOS los Pedidos Semanales Bodega del sistema)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 12.4 Consideraciones Técnicas

| Aspecto | Consideración |
|---------|---------------|
| **Performance** | Si hay cientos de Pedidos, considerar **paginación** |
| **Caché** | Los Pedidos cambian raramente; considerar cache en el frontend con `useMemo` |
| **Label dinámico** | El texto debe actualizar en tiempo real al cambiar el checkbox |
| **Reset de filtros** | Si el usuario cambia la asignatura seleccionada, resetear `soloEstaAsignatura` a `true` |
| **Sincronización período** | El contexto global de período podría afectar los Pedidos; validar que funcione correctamente |

---

## 12.5 Testing Recomendado

Después de implementar, verificar:

- [ ] Checkbox visible en AsigCard con label correcto
- [ ] **Activado (defecto):** Solo muestra Pedidos Semanales Bodega de esa asignatura
- [ ] **Desactivado:** Muestra TODOS los Pedidos Semanales Bodega disponibles
- [ ] Label cambia al hacer clic
- [ ] Sin errores 429 (rate limit) al cargar Pedidos
- [ ] Al cambiar de asignatura, Pedidos se actualizan correctamente
- [ ] Filtro funciona con múltiples asignaturas abiertas simultáneamente

---

## 12.6 Archivos a Modificar (Checklist)

| Archivo | Línea aprox | Tipo |
|---------|------------|------|
| `SolicitudController.java` | ~63 | Agregar endpoint |
| `SolicitudService.java` | ~65 | Agregar interfaz |
| `SolicitudServiceImp.java` | ~65 | Implementar lógica |
| `solicitud-service.ts` | ~70 | Agregar nuevo servicio |
| `solicitud.tsx` | ~195, ~541 | Agregar estado + UI |

---

**LISTO PARA IMPLEMENTACIÓN:** Localiza cada archivo, implementa según especificación, prueba en UI.

---

# 13. ⚡ AGREGAR FILTRO DE ASIGNATURA EN PEDIDOS SEMANALES BODEGA

## 13.1 Problema: Falta `id_asignatura` en los resultados

**Contexto:**
- Los Pedidos Semanales Bodega **pueden estar vinculados a una asignatura específica** (opcional)
- Al obtener los Pedidos, el `id_asignatura` NO está siendo devuelto
- El frontend necesita este campo para **filtrar correctamente** qué Pedidos mostrar para cada asignatura

**Síntoma:**
- El frontend recibe los Pedidos sin saber a qué asignatura pertenecen
- No puede filtrar automáticamente para mostrar solo los Pedidos de esa asignatura

---

## 13.2 Cambios Necesarios

### 1️⃣ Backend — MODIFICAR Consulta SQL en Repository

**Archivo:** `backend/src/main/java/KuHub/modules/gestion_solicitud/repository/SolicitudRepository.java`

**Línea:** 93-123 (método `findActiveRecipesWithDetailsRaw()`)

#### ANTES (Consulta actual):
```sql
@Query(value = """
    SELECT
        r.id_pedido_semana_bodega AS idReceta,          -- [0]
        r.nombre_pedido_semana_bodega AS nombreReceta,   -- [1]
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', p.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'esFraccionario', u.es_fraccionario,
                    'activo', p.activo,
                    'idDetallePedidoSemana', d.id_detalle_pedido_semana,
                    'idProducto', p.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) FILTER (WHERE d.id_detalle_pedido_semana IS NOT NULL),
            '[]'::jsonb
        ) AS detallesJson,                               -- [2]
        r.id_semana AS idSemana                          -- [3]
    FROM pedido_semana_bodega r
    LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = r.id_pedido_semana_bodega
    LEFT JOIN producto p ON d.id_producto = p.id_producto
    LEFT JOIN unidad_medida u ON u.id_unidad = p.id_unidad
    WHERE r.activo = true
    AND r.estado_pedido = 'ACTIVO'
    GROUP BY r.id_pedido_semana_bodega, r.nombre_pedido_semana_bodega, r.id_semana
    ORDER BY r.nombre_pedido_semana_bodega ASC
""", nativeQuery = true)
List<Object[]> findActiveRecipesWithDetailsRaw();
```

#### DESPUÉS (Con `id_asignatura`):
```sql
@Query(value = """
    SELECT
        r.id_pedido_semana_bodega AS idReceta,          -- [0]
        r.nombre_pedido_semana_bodega AS nombreReceta,   -- [1]
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'nombreProducto', p.nombre_producto,
                    'cantProducto', d.cant_producto,
                    'abreviatura', u.abreviatura,
                    'esFraccionario', u.es_fraccionario,
                    'activo', p.activo,
                    'idDetallePedidoSemana', d.id_detalle_pedido_semana,
                    'idProducto', p.id_producto,
                    'idUnidad', u.id_unidad,
                    'observacion', d.observacion
                )
            ) FILTER (WHERE d.id_detalle_pedido_semana IS NOT NULL),
            '[]'::jsonb
        ) AS detallesJson,                               -- [2]
        r.id_semana AS idSemana,                         -- [3]
        r.id_asignatura AS idAsignatura                  -- [4] ← AGREGAR ESTA LÍNEA
    FROM pedido_semana_bodega r
    LEFT JOIN detalle_pedido_semana_bodega d ON d.id_pedido_semana_bodega = r.id_pedido_semana_bodega
    LEFT JOIN producto p ON d.id_producto = p.id_producto
    LEFT JOIN unidad_medida u ON u.id_unidad = p.id_unidad
    WHERE r.activo = true
    AND r.estado_pedido = 'ACTIVO'
    GROUP BY r.id_pedido_semana_bodega, r.nombre_pedido_semana_bodega, r.id_semana, r.id_asignatura  -- ← AGREGAR r.id_asignatura
    ORDER BY r.nombre_pedido_semana_bodega ASC
""", nativeQuery = true)
List<Object[]> findActiveRecipesWithDetailsRaw();
```

**Cambios exactos:**
1. **Línea +1:** Agregar `r.id_asignatura AS idAsignatura` como posición `[4]` en el SELECT
2. **Línea GROUP BY:** Agregar `, r.id_asignatura` al final del GROUP BY

---

### 2️⃣ Frontend — ACTUALIZAR DTO para incluir `idAsignatura`

**Archivo:** `frontend/src/services/solicitud-service.ts`

**Línea:** 61-66 (interfaz `IPedidoSemanaBodegaSolicitud`)

#### ANTES:
```typescript
export interface IPedidoSemanaBodegaSolicitud {
  idReceta: number;
  nombreReceta: string;
  idSemana?: number;
  detalles: IDetallePedidoSemanaBodega[];
}
```

#### DESPUÉS:
```typescript
export interface IPedidoSemanaBodegaSolicitud {
  idReceta: number;
  nombreReceta: string;
  idSemana?: number;
  idAsignatura?: number;  // ← AGREGAR (NULL si no está vinculado, o ID de asignatura)
  detalles: IDetallePedidoSemanaBodega[];
}
```

---

### 3️⃣ Frontend — AGREGAR FILTRO por `idAsignatura` en solicitud.tsx

**Archivo:** `frontend/src/pages/solicitud.tsx`

**Línea:** 212-215 (en el `useMemo` de `recetasFiltradas`)

#### ANTES:
```typescript
const recetasFiltradas = React.useMemo(() => {
    if (!periodMatchesGlobal || filterIdSemana === 'todas') return recetas;
    return recetas.filter(r => r.idSemana != null && String(r.idSemana) === filterIdSemana);
  }, [recetas, filterIdSemana, periodMatchesGlobal]);
```

#### DESPUÉS:
```typescript
const recetasFiltradas = React.useMemo(() => {
    if (!periodMatchesGlobal || filterIdSemana === 'todas') {
      // Si no hay semana específica, filtrar al menos por asignatura actual
      // Mostrar: Pedidos sin asignatura (NULL) O Pedidos de esta asignatura
      return recetas.filter(r => r.idAsignatura == null || r.idAsignatura === asig.idAsignatura);
    }
    // Filtrar por ambas condiciones: semana específica Y asignatura
    return recetas.filter(r => 
      r.idSemana != null && String(r.idSemana) === filterIdSemana &&
      (r.idAsignatura == null || r.idAsignatura === asig.idAsignatura)
    );
  }, [recetas, filterIdSemana, periodMatchesGlobal, asig.idAsignatura]);
```

**Lógica del filtro:**
- Mostrar un Pedido Semanal Bodega si:
  - **`idAsignatura = NULL`** (no está vinculado a ninguna asignatura) → disponible para TODAS
  - **`idAsignatura = asig.idAsignatura`** (vinculado a esta asignatura) → disponible SOLO para esa asignatura
- Si además hay un `filterIdSemana` específico, también filtrar por semana

---

## 13.3 Ejemplo de cómo funciona

**Escenario:**
- Asignatura BYM01: Bollería y Masas Dulces (`idAsignatura = 1`)
- Pedido Semanal Base "Masa Folhada" (`idAsignatura = 1`) → solo se ve en BYM01
- Pedido Semanal Base "Base Chocolates" (`idAsignatura = NULL`) → se ve en TODAS las asignaturas

**Resultado:**
```
┌────────────────────────────────────────┐
│ AsigCard: BYM01                        │
├────────────────────────────────────────┤
│ Pedido Semanal Base [Selector]:        │
│   ✓ Masa Folhada (solo BYM01)         │
│   ✓ Base Chocolates (para todas)      │
│   ✗ Masa Teaboard (solo CC01)         │
└────────────────────────────────────────┘
```

---

## 13.4 Checklist de implementación

- [ ] Modificar consulta SQL en `SolicitudRepository.java` (agregar `id_asignatura` al SELECT y GROUP BY)
- [ ] Actualizar interfaz `IPedidoSemanaBodegaSolicitud` en `solicitud-service.ts` (agregar `idAsignatura?: number`)
- [ ] Actualizar filtro en `solicitud.tsx` (agregar lógica de asignatura en `recetasFiltradas`)
- [ ] Probar que los Pedidos se filtran correctamente por asignatura
- [ ] Verificar que Pedidos sin asignatura vinculada (NULL) aparecen en todas las asignaturas

---

# 14. ⚡ FUNCIÓN SQL — Procesamiento de Deltas en `generar_solicitudes_masivas`

## 13.1 Ubicación de la Función

**Archivo:** `ConexionXD_v2.sql`  
**Línea:** 3097  
**Nombre:** `CREATE OR REPLACE FUNCTION generar_solicitudes_masivas()`

---

## 13.2 Propósito

Esta función SQL ejecuta la lógica **principal de creación de solicitudes masivas**. Recibe un JSON con el payload de `MassiveSolicitation` y:

1. **Crea N solicitudes** (una por sección/bloque seleccionado)
2. **Procesa los deltas** (eliminados, modificados, nuevos) del Pedido Semanal Bodega base
3. **Multiplica cantidades** según cantidad de alumnos inscritos
4. **Redondea productos** según si son fraccionarios o no

**Retorna:**
```
total_solicitudes: INTEGER
total_detalles: INTEGER
```

---

## 13.3 Firma de la Función

```sql
CREATE OR REPLACE FUNCTION generar_solicitudes_masivas(
    p_payload JSONB,
    OUT total_solicitudes INTEGER,
    OUT total_detalles INTEGER
)
```

**Entrada:** 
- `p_payload`: Array JSON de `MassiveSolicitation` (ver CONTEXTO_SOLICITUD.md sección 8.2)

**Salida:**
- `total_solicitudes`: Total de solicitudes creadas
- `total_detalles`: Total de detalles/productos insertados

---

## 13.4 Flujo de la Función (Líneas 3125-3244)

### Loop Externo (línea 3128)
Itera sobre cada elemento del array `p_payload` (cada MassiveSolicitation):
```sql
FOR v_solicitud_masiva IN SELECT * FROM jsonb_array_elements(p_payload)
```

**Variables extraídas:**
- `v_id_receta`: ID del Pedido Semanal Bodega base (puede ser NULL)
- `v_observacion_general`: Observaciones generales para toda la solicitud

### Loop Interno (línea 3138)
Itera sobre las secciones de ESTA solicitud masiva:
```sql
FOR v_seccion IN SELECT * FROM jsonb_array_elements(v_solicitud_masiva->'secciones')
```

**Variables extraídas:**
- `v_id_seccion`, `v_id_usuario`, `v_cant_inscritos`
- `v_fecha_solicitada`: Fecha del primer horario
- `v_id_reserva_sala`: ID de la reserva del primer horario
- `v_multiplicador`: `cant_inscritos / 20.0` (línea 3151)

### Creación de Solicitud (línea 3154-3170)
```sql
INSERT INTO solicitud (...)
VALUES (v_id_usuario, v_id_seccion, v_id_receta, v_id_reserva_sala, v_fecha_solicitada, v_observacion_general, 'PENDIENTE')
RETURNING id_solicitud INTO v_id_solicitud;
```

### Inserción de Detalles (línea 3176-3237)
**BLOQUE A (línea 3194-3209): Base intacta del Pedido Semanal Bodega**
- Selecciona items de `detalle_pedido_semana_bodega` del Pedido Semanal Bodega
- **EXCLUYE** items que están en `deltas.eliminados` (línea 3202-3205)
- **EXCLUYE** items que están en `deltas.modificados` (línea 3206-3209)

```sql
WHERE v_id_receta IS NOT NULL
  AND dr.id_pedido_semana_bodega = v_id_receta
  AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_solicitud_masiva->'deltas'->'eliminados', '[]'::jsonb)) e
      WHERE e::INTEGER = dr.id_detalle_pedido_semana
  )
  AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'modificados', '[]'::jsonb)) m
      WHERE (m->>'idDetalleReceta')::INTEGER = dr.id_detalle_pedido_semana
  )
```

**BLOQUE B (línea 3213-3223): Modificados**
- Selecciona items de `deltas.modificados`
- Reemplaza la cantidad con `(m->>'cantProducto')::NUMERIC`
- Usa la observación del delta si existe, sino usa la del Pedido Semanal Bodega original

```sql
FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'modificados', '[]'::jsonb)) m
JOIN detalle_pedido_semana_bodega dr ON dr.id_detalle_pedido_semana = (m->>'idDetalleReceta')::INTEGER
WHERE v_id_receta IS NOT NULL
```

**BLOQUE C (línea 3227-3232): Nuevos**
- Selecciona items de `deltas.nuevos`
- Extrae `idProducto` y `cantProducto` del JSON
- Usa observación del delta (típicamente prefijada con `[ADICIONAL]`)

```sql
FROM jsonb_array_elements(COALESCE(v_solicitud_masiva->'deltas'->'nuevos', '[]'::jsonb)) n
```

### Redondeo de Cantidades (línea 3186-3191)
```sql
CASE
    WHEN u.es_fraccionario = true THEN
        (fp.cant_base * v_multiplicador)::NUMERIC(10,3)
    ELSE
        CEIL(fp.cant_base * v_multiplicador)::NUMERIC(10,3)
END
```

- Si producto es **fraccionario**: multiplica directamente (permite decimales)
- Si **no es fraccionario**: redondea al entero superior con `CEIL()`

---

## 13.5 Problema Identificado: Deltas No Procesan Correctamente

### Síntoma
El usuario reporta: _"los deltas del frontend y la función no tiene los ítems removidos, los ids removidos sí aceptan los modificados pero no se eliminar cuando intenta eliminar"_

### Causa Probable

**Línea 3203:** El array `deltas.eliminados` contiene **IDs de `detalle_pedido_semana_bodega`**, no de `detalle_solicitud`.

```sql
WHERE e::INTEGER = dr.id_detalle_pedido_semana
```

**Problema:** Si el usuario está intentando **editar una solicitud existente** (no crear nueva), el frontend envía IDs de detalles ya creados en `detalle_solicitud`, pero la función SQL espera IDs de `detalle_pedido_semana_bodega`.

### Escenario de Fallo

1. **Crear solicitud masiva:** ✅ Funciona (los IDs de eliminados coinciden con detalles del Pedido Semanal Bodega)
2. **Editar solicitud existente:** ❌ Falla (envía IDs de `detalle_solicitud`, la función no los reconoce)

---

## 13.6 Modificación Requerida

### Contexto
Si la solicitud **YA EXISTE** (se está editando, no creando), el delta debe referenciarse a `detalle_solicitud`, no a `detalle_pedido_semana_bodega`.

### Cambio Necesario en la Función SQL

**Problema en BLOQUE A (línea 3202-3205):**

Actualmente compara contra `dr.id_detalle_pedido_semana` (del Pedido Semanal Bodega base). Si la solicitud ya existe, debería comparar contra `detalle_solicitud` actual.

**Solución:** 
1. **Si `idPedidoSemanaBodega` existe y solicitud es NUEVA:** Usar la lógica actual (comparar con detalles del Pedido Semanal Bodega)
2. **Si solicitud EXISTE y se EDITA:** Necesitaría lógica diferente (comparar con `detalle_solicitud` actual)

**Preguntas para clarificar:**
- ¿Hay un endpoint separado para EDITAR solicitudes (DELETE + INSERT)?
- ¿O la función `generar_solicitudes_masivas` se usa también para editar?

### Recomendación Técnica

Si se necesita **soporte para edición**, se requeriría:

1. **Agregar parámetro a la función:**
```sql
CREATE OR REPLACE FUNCTION generar_solicitudes_masivas(
    p_payload JSONB,
    p_solicitud_id_existente INTEGER DEFAULT NULL,  -- ← NUEVO
    OUT total_solicitudes INTEGER,
    OUT total_detalles INTEGER
)
```

2. **Lógica condicional en BLOQUE A:**
```sql
AND NOT EXISTS (
    CASE 
        WHEN p_solicitud_id_existente IS NOT NULL THEN
            -- Editando: comparar con detalle_solicitud
            SELECT 1 FROM detalle_solicitud ds
            WHERE ds.id_solicitud = p_solicitud_id_existente
            AND ds.id_detalle_solicitud = e::INTEGER
        ELSE
            -- Creando: comparar con detalles del Pedido Semanal Bodega (actual)
            SELECT 1 FROM detalle_pedido_semana_bodega
            WHERE id_detalle_pedido_semana = e::INTEGER
    END
)
```

---

## 13.7 Checklist de Verificación

Antes de implementar, verificar:

- [ ] ¿Se usa `generar_solicitudes_masivas` solo para **crear** solicitudes?
- [ ] ¿Hay un endpoint/función separada para **editar** solicitudes?
- [ ] ¿El frontend envía los mismos IDs (`idDetallePedidoSemanaBodega`) o diferente (`idDetalleSolicitud`)?
- [ ] ¿Los `deltas.eliminados` contienen qué: IDs del Pedido Semanal Bodega o IDs de solicitud?

---

## 13.8 Archivos Relacionados

| Archivo | Línea | Función |
|---------|-------|---------|
| `ConexionXD_v2.sql` | 3097 | Función principal `generar_solicitudes_masivas()` |
| `CONTEXTO_SOLICITUD.md` | Sección 8.2 | Especificación de payload `MassiveSolicitation` |
| `backend/.../SolicitudController.java` | ~ | Endpoint que llama a esta función |
| `backend/.../SolicitudService.java` | ~ | Servicio que invoca función SQL |

