# Contexto: Importación Excel — Pedido Semanal a Bodega

## Decisión arquitectónica

**Opción elegida: validación por backend**

El usuario sube un archivo `.xlsm` desde el frontend. El frontend lo envía al backend
(multipart/form-data). El backend parsea, valida los productos contra la BD y retorna
un JSON con los resultados. El frontend usa ese JSON para poblar el formulario.

---

## Estructura real del archivo Excel

**Archivo:** `CHOCOLATERÍA LISTADO PEDIDO 2025.xlsm`

### Hojas del libro

| Índice | Nombre | Descripción |
|--------|--------|-------------|
| 0 | `LISTADO PRODUCTOS` | Lista maestra de todos los productos (sin cantidades). **No leer.** |
| 1–18 | `SEMANA (1)` … `SEMANA (18)` | Pedido semanal por semana. **Esta es la hoja a leer.** |

La hoja activa cuando el usuario guarda/sube el archivo es la `SEMANA (X)` que tenía abierta.
El backend debe usar `workbook.getActiveSheetIndex()`, NO `getSheetAt(0)`.

### Columnas de las hojas SEMANA (0-based en POI)

| Índice POI | Columna Excel | Contenido | Uso |
|-----------|---------------|-----------|-----|
| 0 | A | Siempre vacía | Solo para el check de skip |
| 1 | B | Nombre del producto (MAYÚSCULAS) | `celdaB` → búsqueda en BD |
| 2 | C | Unidad de medida (del Excel) | **No se usa** — se toma del join con `unidad_medida` en BD |
| 3 | D | Cantidad | `parseCantidad(row.getCell(3))` |
| 4 | E | Observación (casi siempre vacío) | `celdaE` opcional |

### Filas relevantes

- **Inicio:** fila 12 en Excel → índice 11 en POI (0-based)
- **Fin:** fila 80 en Excel → índice 79 en POI
- **Skip:** si A + B + C están todas en blanco → ignorar la fila
- Las filas con encabezados de categoría (ej. "ABARROTES", "VERDURAS Y FRUTAS") pasan el check de skip pero no se encuentran en BD → quedan como `no_encontrado` (comportamiento esperado)

---

## Implementación backend — COMPLETADA

### Dependencia agregada (`pom.xml`)

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.3.0</version>
</dependency>
```

### Record de respuesta

**Archivo:** `backend/.../dtos/respose/record/ImportarExcelResultado.java`

```java
public record ImportarExcelResultado(
        List<ResultadoItem> resultados,
        int totalOk,
        int totalNoEncontrados
) {
    public record ResultadoItem(
            int fila, String nombreExcel, Integer idProducto,
            String nombreProducto, String nombreUnidadMedida,
            BigDecimal cantidad, String observacion, String estado
    ) {}
}
```

### Endpoint

**Archivo:** `backend/.../controller/PedidoSemanaBodegaController.java`
**Ruta:** `POST /api/v1/pedido-semana-bodega/importar-excel`

```java
@PostMapping(value = "/importar-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<ImportarExcelResultado> importarExcel(
        @RequestParam("archivo") MultipartFile archivo) {
    return ResponseEntity.status(200)
            .body(pedidoSemanaBodegaService.importarExcelProductos(archivo));
}
```

### Seguridad (`SpringSecurityConfig.java`)

Se agregó regla explícita antes del bloque POST genérico:

```java
.requestMatchers(HttpMethod.POST, "/api/v*/pedido-semana-bodega/importar-excel")
.hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO")
```

### Lógica de parseo (`PedidoSemanaBodegaServiceImp.java`)

Puntos clave del método `importarExcelProductos()`:

```java
// Leer la hoja activa (SEMANA X), NO getSheetAt(0) que es "LISTADO PRODUCTOS"
int activeIdx = workbook.getActiveSheetIndex();
Sheet sheet   = workbook.getSheetAt(activeIdx);

// Nombre del producto viene de la columna B (índice 1)
String celdaB             = getCellText(row.getCell(1), formatter);
String nombreExcel        = celdaB.trim();
String nombreParaBusqueda = StringUtils.capitalizarPalabras(celdaB); // normaliza mayúsculas

// Cantidad en columna D (índice 3), observación en E (índice 4)
BigDecimal cantidad = parseCantidad(row.getCell(3));
String celdaE       = getCellText(row.getCell(4), formatter);

// Búsqueda en BD: solo activos, por nombre normalizado
Optional<Producto> productoOpt =
    productoRepository.findByNombreProductoAndActivo(nombreParaBusqueda, true);
```

La unidad de medida NO se lee del Excel (col C); se obtiene de la relación JPA:
`producto.getUnidadMedida().getNombreUnidad()`

### Método `parseCantidad` (privado en el Service)

```java
private BigDecimal parseCantidad(Cell cell) {
    if (cell == null) return null;
    CellType type = cell.getCellType() == CellType.FORMULA
            ? cell.getCachedFormulaResultType() : cell.getCellType();
    if (type == CellType.NUMERIC) {
        return BigDecimal.valueOf(cell.getNumericCellValue()).setScale(3, RoundingMode.HALF_UP);
    }
    if (type == CellType.STRING) {
        String val = cell.getStringCellValue().trim().replace(".", "").replace(",", ".");
        try { return new BigDecimal(val).setScale(3, RoundingMode.HALF_UP); }
        catch (NumberFormatException ignored) { return null; }
    }
    return null;
}
```

### Método `getCellText` (privado en el Service)

```java
private String getCellText(Cell cell, DataFormatter formatter) {
    if (cell == null) return "";
    return formatter.formatCellValue(cell).trim();
}
```

---

## Implementación frontend — COMPLETADA

### Tipos agregados (`frontend/src/types/receta.types.ts`)

```typescript
export interface IResultadoItemExcel {
  fila: number;
  nombreExcel: string;
  idProducto?: number;
  nombreProducto?: string;
  nombreUnidadMedida?: string;
  cantidad?: number;
  observacion?: string;
  estado: 'ok' | 'no_encontrado';
}
export interface IImportarExcelResultado {
  resultados: IResultadoItemExcel[];
  totalOk: number;
  totalNoEncontrados: number;
}
```

### Servicio (`frontend/src/services/receta-service.ts`)

```typescript
export const importarExcelPedidoService = async (archivo: File): Promise<IImportarExcelResultado> => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const response = await api.post<IImportarExcelResultado>(
    '/pedido-semana-bodega/importar-excel',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};
```

### Página (`frontend/src/pages/pedido-semanal-a-bodega.tsx`)

**En `DetalleReceta`** — estado, ref y handler:

```typescript
const [isImporting, setIsImporting] = React.useState(false);
const fileInputRef = React.useRef<HTMLInputElement>(null);

const handleImportarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = ''; // permite re-seleccionar el mismo archivo
  setIsImporting(true);
  try {
    const resultado = await importarExcelPedidoService(file);
    if (resultado.totalOk > 0 && formRef.current?.importarDesdeExcel) {
      formRef.current.importarDesdeExcel(resultado.resultados);
      toast.success(`${resultado.totalOk} producto(s) importado(s) correctamente`);
    }
    if (resultado.totalNoEncontrados > 0) {
      const noEncontrados = resultado.resultados.filter(r => r.estado === 'no_encontrado');
      const nombres = noEncontrados.map(r => r.nombreExcel).filter(Boolean);
      const mensaje = nombres.length <= 3
        ? `No encontrado(s): ${nombres.join(', ')}`
        : `${resultado.totalNoEncontrados} productos no encontrados en el sistema`;
      toast.warning(mensaje);
    }
    if (resultado.totalOk === 0 && resultado.totalNoEncontrados === 0) {
      toast.warning('El archivo no contiene datos válidos para importar');
    }
  } catch (error: any) {
    toast.error(error?.message || 'Error al procesar el archivo Excel');
  } finally {
    setIsImporting(false);
  }
};
```

**En `ModalFooter`** — input oculto y botón:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept=".xlsx,.xlsm,.xls"
  style={{ display: 'none' }}
  onChange={handleImportarExcel}
/>
{mode !== 'ver' && (
  <Button
    variant="bordered"
    onPress={() => fileInputRef.current?.click()}
    isLoading={isImporting}
    isDisabled={isSaving || isImporting}
    className="font-medium border-default-300"
    startContent={!isImporting ? <Icon icon="lucide:file-spreadsheet" width={16} /> : undefined}
  >
    Importar Excel
  </Button>
)}
```

**En `FormularioReceta` — `useImperativeHandle`** — método `importarDesdeExcel`:

```typescript
importarDesdeExcel: (resultados: IResultadoItemExcel[]) => {
  const nuevos = resultados
    .filter(r => r.estado === 'ok' && r.idProducto != null)
    .map(r => ({
      id: `excel_${r.fila}_${r.idProducto}_${Math.random().toString(36).slice(2)}`,
      productoId: r.idProducto!.toString(),
      productoNombre: r.nombreProducto ?? '',
      cantidad: r.cantidad ?? 0,
      unidadMedida: r.nombreUnidadMedida ?? '',
      observacion: r.observacion ?? ''
    }));
  if (nuevos.length > 0) {
    setIngredientes(prev => [...prev, ...nuevos]);
  }
},
```

---

## Bugs encontrados y corregidos durante la implementación

### Bug 1 — Producto buscado con string vacío (sesión 2)

**Síntoma:** Backend retornaba 0 encontrados, 69 no encontrados. Logs mostraban:
`binding parameter (1:VARCHAR) <- []`

**Causa:** El código leía `row.getCell(0)` (columna A, siempre vacía) para el nombre del producto en vez de `row.getCell(1)` (columna B).

**Fix:** Cambiar `celdaA` → `celdaB` en las líneas que extraen `nombreExcel` y `nombreParaBusqueda`.

### Bug 2 — Leyendo hoja incorrecta (sesión 2)

**Síntoma:** Después del fix anterior, el backend leía nombres de productos correctamente pero eran verduras/frutas, no chocolates. Sólo 1 de 69 encontrado.

**Causa:** `workbook.getSheetAt(0)` lee "LISTADO PRODUCTOS" (lista maestra sin cantidades), no la hoja SEMANA activa.

**Fix:** Usar `workbook.getSheetAt(workbook.getActiveSheetIndex())` para leer la hoja que el usuario tenía seleccionada al subir el archivo.

---

## Estado actual

- [x] Dependencia Apache POI en `pom.xml`
- [x] Record `ImportarExcelResultado` con `ResultadoItem` anidado
- [x] Método `importarExcelProductos()` en `PedidoSemanaBodegaServiceImp`
- [x] Endpoint `POST /api/v1/pedido-semana-bodega/importar-excel`
- [x] Regla en `SpringSecurityConfig` (sin 403)
- [x] Tipos `IResultadoItemExcel` / `IImportarExcelResultado` en `receta.types.ts`
- [x] `importarExcelPedidoService()` en `receta-service.ts`
- [x] Botón "Importar Excel" en `ModalFooter` de `pedido-semanal-a-bodega.tsx`
- [x] Handler `handleImportarExcel` con toasts de éxito/warning/error
- [x] Método `importarDesdeExcel()` expuesto via `useImperativeHandle` en `FormularioReceta`
- [x] Logs detallados en backend (hoja activa, cada fila, encontrado/no encontrado)
- [x] **Funcional en entorno de desarrollo**
