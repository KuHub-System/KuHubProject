# REFACTORIZACIÓN BÚSQUEDA GLOBAL DE PRODUCTOS

## ✅ COMPLETADO EN BACKEND

1. **DTOs creados:**
   - `ProductoBuscadoDTO.java` — Producto encontrado en búsqueda
   - `BusquedaProductosGlobalDTO.java` — Respuesta agrupada por proveedor

2. **ProveedorRepository.java:**
   - Agregado método `buscarProductosGlobal(@Param("searchTerm") String)` con query SQL
   - ✅ **CORREGIDO (2026-04-27):** Removido `ORDER BY` duplicado que causaba error "column must appear in GROUP BY". La sintaxis correcta en PostgreSQL requiere que el `ORDER BY` esté dentro de `json_agg()`.

3. **ProveedorService.java:**
   - Agregado import de `BusquedaProductosGlobalDTO`
   - Agregada firma del método `buscarProductosGlobal(String searchTerm)`

4. **ProveedorServiceImpl.java:**
   - Implementado método `buscarProductosGlobal()` con deserialización JSON
   - Agregados imports necesarios

5. **ProveedorController.java:**
   - Agregado endpoint `GET /api/v1/proveedor/buscar-productos-global?q=searchTerm`
   - Retorna `List<BusquedaProductosGlobalDTO>`

## 📝 PENDIENTE EN FRONTEND

### 1. Actualizar imports en `gestion-proveedores.tsx`

```typescript
// AGREGAR:
import { buscarProductosGlobalService } from '../services/proveedor-service';
import type {
  // ... existentes ...
  IBusquedaProductosGlobal,
  IProductoBuscado,
} from '../types/proveedor.types';
```

### 2. REMOVER estados de búsqueda global antigua

```typescript
// ELIMINAR estas líneas:
const [globalProductSearch, setGlobalProductSearch] = React.useState('');
const [globalSortBy, setGlobalSortBy] = React.useState<'precio-asc' | 'precio-desc' | ''>('');
const [globalMostrarInactivos, setGlobalMostrarInactivos] = React.useState(true);
```

### 3. AGREGAR nuevos estados para búsqueda optimizada

```typescript
// AGREGAR después de los estados de cargas iniciales:

// ── Búsqueda global optimizada ──
const [busquedaGlobal, setBusquedaGlobal] = React.useState('');
const [resultadosBusqueda, setResultadosBusqueda] = React.useState<IBusquedaProductosGlobal[]>([]);
const [loadingBusqueda, setLoadingBusqueda] = React.useState(false);
const [errorBusqueda, setErrorBusqueda] = React.useState<string | null>(null);

// ── Filtros de búsqueda global ──
const [estadoProveedorFiltro, setEstadoProveedorFiltro] = React.useState<'DISPONIBLE' | 'NO_DISPONIBLE' | ''>('');
const [precioOrdenFiltro, setPrecioOrdenFiltro] = React.useState<'precio-asc' | 'precio-desc' | ''>('');

// ── Control de expansión en resultados de búsqueda ──
const [expandedSearchResults, setExpandedSearchResults] = React.useState<Set<number>>(new Set());
const [mostrarInactivosBusqueda, setMostrarInactivosBusqueda] = React.useState(true);
```

### 4. REMOVER efecto de búsqueda global antigua

Eliminar completos estos useEffect:
- Línea ~590: `useEffect` que carga detalles de proveedores en búsqueda global (debounce 500ms)
- Línea ~617: `useEffect` que carga detalles en ordenamiento
- Línea ~642: `useEffect` que auto-expande filas con búsqueda global
- Línea ~663: `useEffect` que contrae filas cuando se limpia búsqueda

### 5. AGREGAR nuevo efecto para búsqueda global optimizada

```typescript
React.useEffect(() => {
  if (!busquedaGlobal.trim()) {
    setResultadosBusqueda([]);
    setErrorBusqueda(null);
    return;
  }

  const timer = setTimeout(async () => {
    setLoadingBusqueda(true);
    setErrorBusqueda(null);
    try {
      const data = await buscarProductosGlobalService(busquedaGlobal);
      setResultadosBusqueda(data);
    } catch (err: any) {
      setErrorBusqueda(err.message || 'Error en la búsqueda');
    } finally {
      setLoadingBusqueda(false);
    }
  }, 500); // Debounce 500ms

  return () => clearTimeout(timer);
}, [busquedaGlobal]);
```

### 6. REMOVER funciones de filtrado innecesarias

Eliminar:
- `proveedoresFiltrados` (memo que filtraba por búsqueda global y ordenamiento)
- Toda la lógica que acompañaba esa función

### 7. AGREGAR función para aplicar filtros a resultados

```typescript
const aplicarFiltrosResultados = React.useMemo(() => {
  let resultado = resultadosBusqueda;

  // Filtrar por estado del proveedor
  if (estadoProveedorFiltro) {
    resultado = resultado.filter(r => r.estadoProveedor === estadoProveedorFiltro);
  }

  // Ordenar por precio
  if (precioOrdenFiltro) {
    resultado = [...resultado].map(proveedor => ({
      ...proveedor,
      productosEncontrados: [...proveedor.productosEncontrados].sort((a, b) => {
        const orden = precioOrdenFiltro === 'precio-asc' ? 1 : -1;
        return (a.precioProducto - b.precioProducto) * orden;
      }),
    }));
  }

  // Filtrar productos inactivos
  if (!mostrarInactivosBusqueda) {
    resultado = resultado.map(proveedor => ({
      ...proveedor,
      productosEncontrados: proveedor.productosEncontrados.filter(p => p.activo),
    }));
  }

  return resultado;
}, [resultadosBusqueda, estadoProveedorFiltro, precioOrdenFiltro, mostrarInactivosBusqueda]);
```

### 8. REORGANIZAR el JSX del componente

**ESTRUCTURA NUEVA:**

```
┌─────────────────────────────────────────┐
│  Card con filtros básicos:              │
│  - Input búsqueda por nombre/RUT        │
│  - Select estado DISPONIBLE/NO_DISPONIBLE│
│  - Botón "+ Nuevo Proveedor"           │
│  - Botón "Proyección Cotización"        │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  NUEVO: Card con buscador global        │
│  - Input búsqueda de productos          │
│  - Filtros: Estado, Precio              │
│  - Checkbox mostrar/esconder inactivos  │
└─────────────────────────────────────────┘
         ↓
   IF busquedaGlobal IS FILLED:
   ┌──────────────────────────────────────┐
   │  TABLA DE RESULTADOS DE BÚSQUEDA    │
   │  (agrupada por proveedor)           │
   │  - Expandibles por proveedor        │
   │  - Muestra productos encontrados    │
   │  - Aplica filtros                  │
   └──────────────────────────────────────┘
   
   ELSE:
   ┌──────────────────────────────────────┐
   │  LISTA NORMAL DE PROVEEDORES        │
   │  (scroll infinito)                  │
   └──────────────────────────────────────┘
```

### 9. REMOVER líneas de JSX antigua

**En Card de filtros (línea ~943):**
- Remover todo el `<div>` con clase `bg-warning-50` que contiene:
  - Título "🔍 Buscar Producto en Todos los Proveedores"
  - Input global de búsqueda
  - Select "Ordenar por..."
  - Checkbox "Esconder productos deshabilitados"
  - Texto de estado de búsqueda

### 10. AGREGAR nuevas secciones de JSX

**Después de los botones "+ Nuevo Proveedor" y "Proyección Cotización":**

```tsx
{/* ── NUEVO: Buscador Global de Productos ── */}
<Card className="shadow-sm bg-default-50 dark:bg-content1 border border-default-200 dark:border-default-100 mt-6">
  <CardBody className="p-4 space-y-4">
    <div className="flex flex-col gap-3 p-3 bg-success-50 dark:bg-success-50/20 rounded-lg border border-success-200 dark:border-success-100/30">
      <p className="text-xs font-semibold text-success-700 dark:text-success-500 uppercase tracking-wide">
        🔍 Buscar Producto en Todos los Proveedores
      </p>

      {/* Fila: Input búsqueda */}
      <div>
        <Input
          placeholder="Ingresa el nombre o código del producto..."
          value={busquedaGlobal}
          onValueChange={setBusquedaGlobal}
          startContent={<Icon icon="lucide:package-search" className="text-success-500" />}
          variant="bordered"
          classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50 border-success-300 dark:border-success-200/50' }}
          isClearable
          onClear={() => setBusquedaGlobal('')}
          size="sm"
        />
      </div>

      {/* Fila: Filtros */}
      <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
        {/* Estado Proveedor */}
        <Select
          label="Estado Proveedor"
          selectedKeys={estadoProveedorFiltro ? new Set([estadoProveedorFiltro]) : new Set()}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            setEstadoProveedorFiltro(val as EstadoProveedor | '');
          }}
          className="w-full md:w-48"
          variant="bordered"
          classNames={{ trigger: 'bg-white dark:bg-default-100/50 border-success-300 dark:border-success-200/50' }}
          size="sm"
        >
          <SelectItem key="" textValue="Todos">Todos</SelectItem>
          <SelectItem key="DISPONIBLE" textValue="Disponible">Disponible</SelectItem>
          <SelectItem key="NO_DISPONIBLE" textValue="No Disponible">No Disponible</SelectItem>
        </Select>

        {/* Ordenar por Precio */}
        <Select
          label="Ordenar Precio"
          selectedKeys={precioOrdenFiltro ? new Set([precioOrdenFiltro]) : new Set()}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            setPrecioOrdenFiltro(val as 'precio-asc' | 'precio-desc' | '');
          }}
          className="w-full md:w-48"
          variant="bordered"
          classNames={{ trigger: 'bg-white dark:bg-default-100/50 border-success-300 dark:border-success-200/50' }}
          size="sm"
        >
          <SelectItem key="" textValue="Sin ordenar">Sin ordenar</SelectItem>
          <SelectItem key="precio-asc" textValue="Menor Precio">Menor Precio</SelectItem>
          <SelectItem key="precio-desc" textValue="Mayor Precio">Mayor Precio</SelectItem>
        </Select>
      </div>

      {/* Checkbox mostrar inactivos */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="esconderInactivosBusqueda"
          checked={!mostrarInactivosBusqueda}
          onChange={(e) => setMostrarInactivosBusqueda(!e.target.checked)}
          className="w-4 h-4 rounded cursor-pointer accent-success"
        />
        <label
          htmlFor="esconderInactivosBusqueda"
          className="text-xs text-success-700 dark:text-success-500 cursor-pointer hover:text-success-800 transition-colors"
        >
          Esconder productos deshabilitados
        </label>
      </div>

      {busquedaGlobal && (
        <p className="text-xs text-success-600 dark:text-success-400">
          {loadingBusqueda ? 'Buscando productos...' : `${aplicarFiltrosResultados.length} proveedor(es) encontrado(s)`}
        </p>
      )}
    </div>
  </CardBody>
</Card>
```

**Para mostrar resultados (reemplazar la sección de lista de proveedores):**

```tsx
{/* Mostrar resultados de búsqueda SI hay búsqueda */}
{busquedaGlobal.trim() ? (
  <>
    {loadingBusqueda && (
      <div className="flex justify-center py-16">
        <Spinner size="lg" color="success" label="Buscando productos..." />
      </div>
    )}

    {!loadingBusqueda && errorBusqueda && (
      <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-50/10">
        <CardBody className="flex flex-row items-center gap-3 p-4">
          <Icon icon="lucide:alert-triangle" className="text-danger" width={22} />
          <p className="text-danger text-sm">{errorBusqueda}</p>
          <Button size="sm" variant="flat" color="danger" onPress={() => setBusquedaGlobal('')}>
            Limpiar búsqueda
          </Button>
        </CardBody>
      </Card>
    )}

    {!loadingBusqueda && !errorBusqueda && aplicarFiltrosResultados.length === 0 && (
      <Card className="border border-default-200 bg-default-50">
        <CardBody className="flex flex-col items-center gap-2 py-8 text-default-400">
          <Icon icon="lucide:package-x" width={40} />
          <p className="text-sm text-center">
            No se encontró el producto <strong>"{busquedaGlobal}"</strong>
          </p>
        </CardBody>
      </Card>
    )}

    {!loadingBusqueda && !errorBusqueda && aplicarFiltrosResultados.length > 0 && (
      <div className="space-y-3">
        {aplicarFiltrosResultados.map((resultado) => (
          <Card key={resultado.idProveedor} className="shadow-sm border border-default-200 dark:border-default-100">
            <CardBody className="p-0">
              {/* Header de resultado similar a proveedor individual */}
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-default-50"
                   onClick={() => {
                     const newExpanded = new Set(expandedSearchResults);
                     if (newExpanded.has(resultado.idProveedor)) {
                       newExpanded.delete(resultado.idProveedor);
                     } else {
                       newExpanded.add(resultado.idProveedor);
                     }
                     setExpandedSearchResults(newExpanded);
                   }}>
                <div className="flex items-center gap-3">
                  <Icon
                    icon={expandedSearchResults.has(resultado.idProveedor) ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                    className="text-default-400"
                    width={20}
                  />
                  <div>
                    <h3 className="font-bold text-base text-secondary">
                      {resultado.nombreDistribuidora}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-default-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:user" width={12} />
                        {resultado.nombreProveedor}
                      </span>
                      <span className="text-default-300">•</span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:phone" width={12} />
                        {resultado.telefonoProveedor}
                      </span>
                      <span className="text-default-300">•</span>
                      <span className="flex items-center gap-1">
                        <Icon icon="lucide:mail" width={12} />
                        {resultado.emailProveedor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Chip color="primary" size="sm" variant="flat">
                    {resultado.productosEncontrados.length} producto{resultado.productosEncontrados.length !== 1 ? 's' : ''}
                  </Chip>
                  {resultado.estadoProveedor === 'DISPONIBLE'
                    ? <Chip color="success" size="sm" variant="flat">Disponible</Chip>
                    : <Chip color="danger" size="sm" variant="flat">No Disponible</Chip>
                  }
                </div>
              </div>

              {/* Tabla de productos encontrados (expandible) */}
              <AnimatePresence>
                {expandedSearchResults.has(resultado.idProveedor) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 bg-default-50 dark:bg-default-100/20 border-t border-default-100">
                      <div className="overflow-x-auto rounded-lg border border-default-200 dark:border-default-100">
                        <table className="w-full text-xs">
                          <thead className="bg-default-100 dark:bg-default-50">
                            <tr>
                              <th className="text-left py-2 px-3 font-medium">Producto</th>
                              <th className="text-center py-2 px-3 font-medium">Código</th>
                              <th className="text-left py-2 px-3 font-medium">Categoría</th>
                              <th className="text-center py-2 px-3 font-medium">Unidad</th>
                              <th className="text-right py-2 px-3 font-medium">Precio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultado.productosEncontrados.map((prod) => (
                              <tr key={prod.idProducto} className="border-t border-default-100 hover:bg-default-50 dark:hover:bg-default-100/20">
                                <td className="py-2 px-3">{prod.nombreProducto}</td>
                                <td className="py-2 px-3 text-center text-default-500">{prod.codProducto}</td>
                                <td className="py-2 px-3">{prod.categoria}</td>
                                <td className="py-2 px-3 text-center">{prod.unidad}</td>
                                <td className="py-2 px-3 text-right font-semibold">
                                  ${prod.precioProducto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
        ))}
      </div>
    )}
  </>
) : (
  /* MOSTRAR LISTA NORMAL DE PROVEEDORES CUANDO NO HAY BÚSQUEDA */
  // ... aquí va el código existente de lista de proveedores ...
)}
```

## 🎯 ORDEN DE IMPLEMENTACIÓN

1. ✅ Backend completado
2. Actualizar `proveedor.types.ts` con nuevos tipos ✅
3. Actualizar `proveedor-service.ts` con nueva función ✅
4. Refactorizar `gestion-proveedores.tsx` (paso a paso):
   - Agregar imports
   - Agregar nuevos estados
   - Remover lógica antigua
   - Agregar nuevo efecto
   - Agregar función de filtros
   - Refactorizar JSX
   - Pruebas exhaustivas

## 📋 CAMBIOS RESUMIDOS

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Búsqueda** | Carga todos los productos de todos los proveedores localmente | Consulta optimizada al backend |
| **Filtros** | Solo ordenamiento por precio | Estado proveedor + Precio |
| **Auto-expansión** | Automática al buscar | Manual (click en proveedor) |
| **Estructura UI** | Buscador al inicio, proveedores abajo | Filtros básicos, luego buscador global, resultados abajo |
| **Performance** | Lento con muchos proveedores | Rápido, consulta optimizada |
| **Mutuamente excluyente** | No | Sí: Estado y Precio |
