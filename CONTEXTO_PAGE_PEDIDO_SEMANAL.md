# Contexto: Página Pedido Semanal a Bodega - Modificación para Selector de Asignatura

**Fecha**: 2026-05-08  
**Estado**: IMPLEMENTADO ✅  
**Objetivo**: Agregar validación de asignaturas activas y mensaje de acceso contextual

---

## 1. FUNCIONAMIENTO ACTUAL

### 1.1 Estructura General de la Página

La página `pedido-semanal-a-bodega.tsx` es un módulo completo que permite:
- **Ver lista**: Tabla paginada de pedidos semanales a bodega
- **Filtros**: Por período, semana, búsqueda de texto
- **Crear/Editar**: Modal con formulario que incluye:
  - Nombre del pedido
  - Descripción
  - Período y semana
  - **Asignatura (Opcional)** ✅ YA EXISTE
  - Ingredientes/Productos (tabla con autocomplete)
  - Importar Excel con productos
  
### 1.2 Estado de Asignaturas - Situación Actual

**Archivo**: `frontend/src/pages/pedido-semanal-a-bodega.tsx`

**Estados iniciales** (líneas ~42-97):
```typescript
// Variables de estado principales
const [asignaturas, setAsignaturas] = React.useState<IAsignatura[]>([]);
const [idAsignaturaSeleccionada, setIdAsignaturaSeleccionada] = React.useState<string>('');
```

**Carga de asignaturas** (dentro del componente `FormularioReceta`):
- Se llama a `obtenerAsignaturasActivasService()` en un `useEffect` al montar
- La función trae todas las asignaturas activas desde backend
- Se muestra en un `<Select>` en la sección "Información General" del modal

**Comportamiento actual**:
- Si `asignaturas.length > 0` → Se muestra el selector (línea ~1784)
- Si `asignaturas.length === 0` → **El selector se oculta completamente**

### 1.3 Flujo de Carga de Datos

```
PedidoSemanalABodegaPage (componente principal)
    ↓
    └─ cargarDatosIniciales()
        ├─ obtenerRecetasPaginadasService() [recetas]
        └─ parallelWithLimit([]) 
            ├─ obtenerProductosParaRecetaService() [productos]
            └─ obtenerRecetasCountService() [conteos]

FormularioReceta (componente subcomponente dentro del modal)
    ↓
    └─ useEffect([])
        └─ obtenerAsignaturasActivasService()
            └─ setAsignaturas()
```

### 1.4 Estructura HTML del Modal

**Líneas ~992-1020** (ModalHeader, ModalBody, ModalFooter):
```typescript
<ModalHeader>
  // Título: "Nuevo Pedido Semanal", "Editar Pedido Semanal", "Detalle..."

<ModalBody>
  // Llamada a <FormularioReceta /> (componente que maneja el formulario)

<ModalFooter>
  // Botones: Cancelar, Importar Excel, Crear/Guardar
```

### 1.5 Estructura del Formulario (FormularioReceta)

**Sección "Información General"** (líneas ~1625-1815):
```
Card → CardBody
  ├─ Input: "Nombre del Pedido Semanal"
  ├─ Textarea: "Descripción (Opcional)"
  ├─ Selectores de Período y Semana
  └─ Select: "Asignatura (Opcional)"   ← YA EXISTE AQUÍ
      └─ Mostrado solo si: asignaturas.length > 0

Sección "Ingredientes"
  └─ Tabla con productos...
```

---

## 2. MODIFICACIÓN SOLICITADA

### 2.1 Requerimiento Funcional

**Cuando NO HAY asignaturas activas** (ahora se oculta el selector):

#### Caso A: Usuario es ADMINISTRADOR
- Mostrar un **mensaje de acceso** con:
  - Icono de alerta
  - Texto informativo: "No hay asignaturas activas disponibles"
  - **Botón de acceso directo** → Navega a `/gestion-academica`
  - Color: warning (amarillo)

#### Caso B: Usuario NO es ADMINISTRADOR (Docente, Profesor, etc.)
- Mostrar un **mensaje de advertencia** con:
  - Icono de alerta
  - Texto informativo: "No hay asignaturas activas disponibles"
  - Texto adicional: "Contacte al Administrador"
  - Color: warning (amarillo)
  - Sin botón de navegación

### 2.2 Escenarios de Uso

| Escenario | Condición | Comportamiento |
|---|---|---|
| **A1** | `asignaturas.length > 0` | Mostrar selector normal (actual) |
| **A2** | `asignaturas.length === 0` + rol=Administrador | Mensaje + Botón → `/gestion-academica` |
| **A3** | `asignaturas.length === 0` + rol≠Administrador | Mensaje + Texto: "Contacte administrador" |

---

## 3. DETALLES TÉCNICOS PARA IMPLEMENTACIÓN

### 3.1 Variables a Considerar

En `FormularioReceta`, ya existen:
```typescript
// Línea ~42
const { user } = useAuth();  // Acceso al usuario actual
const isAdmin = user?.rol === 'Administrador';  // ✅ Ya existe (línea ~74)
const { asignaturas, setAsignaturas } = // Estado de asignaturas
```

### 3.2 Condición Lógica Principal

**Línea actual** (~1783):
```typescript
{asignaturas.length > 0 && (
  // Mostrar selector
)}
```

**Cambio a realizar**:
```typescript
{/* Si hay asignaturas, mostrar selector */}
{asignaturas.length > 0 && (
  <Select>...</Select>
)}

{/* Si NO hay asignaturas, mostrar mensaje contextual */}
{asignaturas.length === 0 && (
  <div className="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-200/30 rounded-lg">
    <Icon icon="lucide:alert-circle" width={18} className="text-warning-600 dark:text-warning-400 shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-medium text-warning-700 dark:text-warning-300">
        No hay asignaturas activas disponibles.
      </p>
      <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
        {isAdmin
          ? 'Para asignar asignaturas a los pedidos, cree una nueva asignatura desde Gestión Académica.'
          : 'Contacte al Administrador para crear asignaturas activas.'}
      </p>
    </div>
    {isAdmin && (
      <Button
        isIconOnly
        variant="light"
        size="sm"
        className="text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/30 shrink-0"
        onPress={() => history.push('/gestion-academica')}
        title="Ir a Gestión Académica - Crear Asignatura"
      >
        <Icon icon="lucide:arrow-right" width={18} />
      </Button>
    )}
  </div>
)}
```

### 3.3 Ubicación Exacta del Código

**Archivo**: `frontend/src/pages/pedido-semanal-a-bodega.tsx`  
**Componente**: `FormularioReceta`  
**Sección**: "Información General" → "Asignatura (Opcional)"  
**Líneas**: ~1783-1811 (selector actual)

**Contexto previo** (línea ~1782):
```typescript
              )}

              {/* Asignatura (Opcional) */}  ← COMENTARIO QUE MARCA EL INICIO
              {asignaturas.length > 0 && (  ← LÍNEA A REEMPLAZAR (1784)
```

**Contexto posterior** (línea ~1812):
```typescript
              )}
            </CardBody>
          </Card>
        </div>
```

---

## 4. CAMBIOS A REALIZAR (LÍNEA POR LÍNEA)

### 4.1 Reemplazar la estructura condicional (Línea ~1783-1811)

**ANTES:**
```typescript
              {/* Asignatura (Opcional) */}
              {asignaturas.length > 0 && (
                <Select
                  label="Asignatura (Opcional)"
                  placeholder="Selecciona una asignatura"
                  variant="bordered"
                  selectedKeys={idAsignaturaSeleccionada ? new Set([idAsignaturaSeleccionada]) : new Set()}
                  onSelectionChange={(keys) => setIdAsignaturaSeleccionada(Array.from(keys as Set<string>)[0] || '')}
                  classNames={{
                    label: 'text-sm font-medium text-default-700',
                    trigger: 'bg-white dark:bg-default-100/50',
                  }}
                  startContent={<Icon icon="lucide:book-open" width={14} className="text-default-400 shrink-0" />}
                >
                  <SelectItem key="" textValue="Ninguna">
                    <span className="text-default-500">Ninguna</span>
                  </SelectItem>
                  <>
                    {asignaturas?.map(asignatura => (
                      <SelectItem key={asignatura.idAsignatura.toString()} textValue={`${asignatura.nombreAsignatura} (${asignatura.codAsignatura})`}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{asignatura.nombreAsignatura}</span>
                          <span className="text-default-400 text-xs">({asignatura.codAsignatura})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                </Select>
              )}
```

**DESPUÉS:**
```typescript
              {/* Asignatura (Opcional) */}
              {asignaturas.length > 0 ? (
                <Select
                  label="Asignatura (Opcional)"
                  placeholder="Selecciona una asignatura"
                  variant="bordered"
                  selectedKeys={idAsignaturaSeleccionada ? new Set([idAsignaturaSeleccionada]) : new Set()}
                  onSelectionChange={(keys) => setIdAsignaturaSeleccionada(Array.from(keys as Set<string>)[0] || '')}
                  classNames={{
                    label: 'text-sm font-medium text-default-700',
                    trigger: 'bg-white dark:bg-default-100/50',
                  }}
                  startContent={<Icon icon="lucide:book-open" width={14} className="text-default-400 shrink-0" />}
                >
                  <SelectItem key="" textValue="Ninguna">
                    <span className="text-default-500">Ninguna</span>
                  </SelectItem>
                  <>
                    {asignaturas?.map(asignatura => (
                      <SelectItem key={asignatura.idAsignatura.toString()} textValue={`${asignatura.nombreAsignatura} (${asignatura.codAsignatura})`}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{asignatura.nombreAsignatura}</span>
                          <span className="text-default-400 text-xs">({asignatura.codAsignatura})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                </Select>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-200/30 rounded-lg">
                  <Icon icon="lucide:alert-circle" width={18} className="text-warning-600 dark:text-warning-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warning-700 dark:text-warning-300">
                      No hay asignaturas activas disponibles.
                    </p>
                    <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                      {isAdmin
                        ? 'Para asignar asignaturas a los pedidos, cree una nueva asignatura desde Gestión Académica.'
                        : 'Contacte al Administrador para crear asignaturas activas.'}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      className="text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/30 shrink-0"
                      onPress={() => history.push('/gestion-academica')}
                      title="Ir a Gestión Académica"
                    >
                      <Icon icon="lucide:arrow-right" width={18} />
                    </Button>
                  )}
                </div>
              )}
```

### 4.2 Variables que ya existen y se usan

**No requieren cambios**, se utilizan tal cual:
- `isAdmin` (línea ~74): Define si el usuario es Administrador
- `asignaturas` (línea ~42): Array de IAsignatura[]
- `idAsignaturaSeleccionada` (línea ~42): Estado string con ID seleccionado
- `history` (línea ~69): Hook de navegación (react-router-dom)
- `Icon` (línea ~31): Componente importado de @iconify/react
- `Button` (línea ~10): Componente HeroUI

---

## 5. PATRONES Y CONVENCIONES A MANTENER

### 5.1 Estilos

**Coincide con patrón usado líneas ~1665-1689** (Aviso de "No hay períodos académicos"):
- Fondo: `bg-warning-50 dark:bg-warning-900/20`
- Borde: `border border-warning-200 dark:border-warning-200/30`
- Icono: `lucide:alert-circle` con color warning
- Textos: `text-warning-700` / `text-warning-600`
- Botón (si aplica): `variant="light"` + `isIconOnly`

### 5.2 Tipografía

- **Título del mensaje**: `text-sm font-medium text-warning-700 dark:text-warning-300`
- **Texto auxiliar**: `text-xs text-warning-600 dark:text-warning-400 mt-1`
- **Sin overline**, sin mayúsculas forzadas (salvo siglas)

### 5.3 Espaciamiento

- Padding contenedor: `p-4`
- Gap entre elementos: `gap-3`
- Margin top para textos: `mt-1`
- Shrink-0 en icono y botón para evitar compresión

### 5.4 Responsividad

- Usa grid/flex `gap-3` que reflow automáticamente
- Icono y botón con `shrink-0` para no comprimir en mobile
- Texto con `flex-1` para ocupar espacio disponible

---

## 6. FLUJO DE EJECUCIÓN (SIN CAMBIOS)

### 6.1 Backend - Endpoint ya existe

**Endpoint**: `GET /api/v1/pedido-semana-bodega/asignaturas/activas`  
**Retorna**: `List<IAsignaturaDTO>` con id_asignatura, cod_asignatura, nombre_asignatura  
**Especificado en**: ESPECIFICACION_id_asignatura.md (líneas ~100-110)

### 6.2 Frontend - Service ya existe

**Función**: `obtenerAsignaturasActivasService()`  
**Ubicación**: `frontend/src/services/pedido-semanal-bodega-service.ts` (línea ~157)  
**Retorna**: `Promise<IAsignatura[]>`

### 6.3 Frontend - Types ya existen

**Interfaz**: `IAsignatura` en `frontend/src/types/receta.types.ts`  
```typescript
export interface IAsignatura {
  idAsignatura: number;
  codAsignatura: string;
  nombreAsignatura: string;
  activo: boolean;
}
```

---

## 7. CHECKLIST DE VALIDACIÓN POST-IMPLEMENTACIÓN

- [ ] Selector de asignatura visible cuando `asignaturas.length > 0`
- [ ] Mensaje de alerta visible cuando `asignaturas.length === 0`
- [ ] Para Administrador: Mensaje incluye botón "→" que navega a `/gestion-academica`
- [ ] Para otros roles: Mensaje incluye solo texto "Contacte al Administrador"
- [ ] Estilos coinciden con patrón de advertencia (warning-50 bg, warning border)
- [ ] Responsive en mobile (flex/gap-3 reflow automático)
- [ ] Dark mode activable (clases `dark:` aplicadas)
- [ ] Icono `lucide:alert-circle` visible y coloreado
- [ ] Botón (si aplica) con hover state

---

## 8. NOTAS IMPORTANTES

### 8.1 Seguridad

- No hay cambios de acceso a datos sensibles
- El check de rol (`isAdmin`) es local, confiar en backend para autenticación real
- El botón solo navega, no ejecuta acciones destructivas

### 8.2 UX

- El mensaje aparece **en la sección del formulario**, no interrumpe el flujo
- Permite al Admin actuar inmediatamente sin cerrar el modal
- Para otros roles, el mensaje es informativo (no bloquea el formulario)

### 8.3 Sin Cambios Requeridos

- Backend: Ya tiene el endpoint y lógica
- Database: Ya tiene asignaturas y vistas
- Service: Ya hace el llamado correcto
- Types: Ya tienen las interfaces definidas
- Estado del modal: No afecta create/edit/view
- Validaciones: No afecta validación de guardado

---

## 9. IMPLEMENTACIÓN ADICIONAL — FILTRO BACKEND POR ASIGNATURA

### 9.1 Contexto

El selector de asignatura implementado en el frontend (sección 4) ahora está visible.
Para que funcione completamente, el backend necesita:

1. **Nuevas queries** en el repositorio para filtrar pedidos por `id_asignatura`
2. **Nuevos métodos** en el servicio que manejen la paginación y filtros combinados
3. **Nueva ruta** en el controlador: `GET /api/v1/pedido-semana-bodega/by-asignatura`
4. **Nueva función** en el frontend para llamar esa ruta al cambiar el selector

### 9.2 Backend — Métodos a agregar en PedidoSemanaBodegaRepository

Se agregan **8 métodos nuevos**:

#### Grupo A: Filtro solo por asignatura
- `findAllWithDetailsPagingByIdAsignatura(idAsignatura, limit, offset)`
- `countByActivoTrueAndIdAsignatura(idAsignatura)`

#### Grupo B: Filtro asignatura + semana
- `findAllWithDetailsPagingByIdSemanaAndIdAsignatura(idSemana, idAsignatura, limit, offset)`
- `countByActivoTrueAndIdSemanaAndIdAsignatura(idSemana, idAsignatura)`

#### Grupo C: Filtro asignatura + búsqueda
- `findAllWithDetailsAndSearchByIdAsignatura(term, idAsignatura, limit, offset)`
- `countWithSearchAndIdAsignatura(term, idAsignatura)`

#### Grupo D: Filtro asignatura + semana + búsqueda
- `findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura(term, idSemana, idAsignatura, limit, offset)`
- `countWithSearchAndIdSemanaAndIdAsignatura(term, idSemana, idAsignatura)`

**Ver**: `PLAN_FILTRO_ASIGNATURA_BACKEND.md` secciones 3.1-3.4 con queries SQL completas.

### 9.3 Backend — Método en PedidoSemanaBodegaService

Nuevo método en interfaz + implementación:
```java
@Transactional(readOnly = true)
PedidoSemanaBodegasPage getPedidosSemanalByIdAsignaturaPaginado(
    Integer idAsignatura,
    Integer page,
    Integer pageSize,
    Integer idSemana,
    String searchTerm);
```

**Lógica**: Evalúa los filtros opcionales y elige el repositorio correcto:
- Solo asignatura → `findAllWithDetailsPagingByIdAsignatura`
- Asignatura + semana → `findAllWithDetailsPagingByIdSemanaAndIdAsignatura`
- Asignatura + búsqueda → `findAllWithDetailsAndSearchByIdAsignatura`
- Asignatura + semana + búsqueda → `findAllWithDetailsAndSearchByIdSemanaAndIdAsignatura`

**Ver**: `PLAN_FILTRO_ASIGNATURA_BACKEND.md` sección 4.

### 9.4 Backend — Nueva ruta en PedidoSemanaBodegaController

```java
@GetMapping("/by-asignatura")
public ResponseEntity<PedidoSemanaBodegasPage> getPedidosByAsignatura(
        @RequestParam Integer idAsignatura,
        @RequestParam(required = false) Integer idSemana,
        @RequestParam(defaultValue = "1") Integer page,
        @RequestParam(defaultValue = "20") Integer pageSize,
        @RequestParam(required = false) String searchTerm)
```

**URL**: `GET /api/v1/pedido-semana-bodega/by-asignatura?idAsignatura=5&page=1&pageSize=20`

**Documentación JavaDoc**:
```
Obtiene pedidos semanales agrupados/filtrados por asignatura seleccionada.
✅ Consumido por frontend: el selector de asignatura llamará esta ruta al cambiar.
```

**Registrar en SpringSecurityConfig** con el rol que tenga acceso (probablemente igual que la ruta principal).

### 9.5 Frontend — Nueva función en pedido-semanal-bodega-service.ts

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

### 9.6 Frontend — Escucha de cambios en el selector

En el componente `PedidoSemanalABodegaPage`, dentro de `useEffect`:

```typescript
React.useEffect(() => {
    if (idAsignaturaSeleccionada) {
        cargarDatosConFiltroAsignatura(idAsignaturaSeleccionada);
    }
}, [idAsignaturaSeleccionada]);

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

### 9.7 Flujo de datos completo

```
Usuario cambia selector de asignatura
    ↓
setIdAsignaturaSeleccionada(nuevoId)
    ↓
useEffect dispara
    ↓
obtenerPedidosFilterByAsignaturaService(idAsignatura, idSemana, ...)
    ↓
GET /api/v1/pedido-semana-bodega/by-asignatura?idAsignatura=5&...
    ↓
PedidoSemanaBodegaController.getPedidosByAsignatura()
    ↓
PedidoSemanaBodegaService.getPedidosSemanalByIdAsignaturaPaginado()
    ↓
Repositorio elige query según filtros disponibles
    ↓
SELECT p.*, d.* ... WHERE activo=true AND id_asignatura=:idAsignatura [+ AND ...]
    ↓
Retorna List<PedidoSemanaBodegaWithDetailsView> paginada
    ↓
Arma PedidoSemanaBodegasPage
    ↓
ResponseEntity.status(200).body(page)
    ↓
Frontend recibe datos
    ↓
setRecetas(response.data)
    ↓
Tabla se redibuja → **Solo muestra pedidos de esa asignatura**
```

---

## RESUMEN

La modificación se divide en **2 fases**:

### Fase 1 (✅ COMPLETADA): Frontend - Selector visual y mensaje
- **Línea ~1783-1834**: Selector con mensaje condicional
- Cambio de `&&` a ternario `? :`
- Diferenciación de roles (Admin vs otros)
- **Sin backend**: Información ya existe localmente

### Fase 2 (⏳ PENDIENTE): Backend - Filtro por asignatura
- **8 nuevos métodos** en `PedidoSemanaBodegaRepository` (queries + counts)
- **1 nuevo método** en `PedidoSemanaBodegaService`
- **1 nueva ruta** en `PedidoSemanaBodegaController` (`GET /by-asignatura`)
- **1 nueva función** en frontend que conecta con la ruta

**Documentos asociados**:
- `CONTEXTO_PAGE_PEDIDO_SEMANAL.md` (este archivo) — Fase 1 completada
- `PLAN_FILTRO_ASIGNATURA_BACKEND.md` — Fase 2 detallada, lista para ejecutar
