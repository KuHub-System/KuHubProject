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

La hoja a leer se determina así:
- Si el usuario seleccionó una semana en el modal de selección del frontend → backend busca la hoja por nombre exacto `SEMANA (X)`.
- Si no se especificó (caso de un solo archivo con una sola hoja SEMANA) → backend usa `workbook.getActiveSheetIndex()`.

### Columnas de las hojas SEMANA (0-based en POI)

| Índice POI | Columna Excel | Contenido | Uso |
|-----------|---------------|-----------|-----|
| 0 | A | Siempre vacía | Solo para el check de skip |
| 1 | B | Nombre del producto (MAYÚSCULAS) | `celdaB` → búsqueda en BD |
| 2 | C | Unidad de medida (del Excel) | **No se usa** — se toma del join con `unidad_medida` en BD |
| 3 | D | Cantidad | `parseCantidad(row.getCell(3))` |
| ? | ? | Observación | **Columna dinámica** — se detecta desde la cabecera (ver abajo) |

### Filas relevantes

- **Cabecera:** fila 11 en Excel → índice 10 en POI. Se usa para detectar la columna de observación.
- **Inicio datos:** fila 12 en Excel → índice 11 en POI
- **Fin datos:** fila 80 en Excel → índice 79 en POI
- **Skip:** si A + B + C están todas en blanco → ignorar la fila
- Las filas con encabezados de categoría (ej. "ABARROTES", "VERDURAS Y FRUTAS") pasan el check de skip pero no se encuentran en BD → quedan como `no_encontrado` (comportamiento esperado)

### Detección dinámica de la columna de observación

La columna de observación puede variar entre hojas. El backend la detecta automáticamente:

```java
// Fila 11 Excel = índice 10 POI = cabecera
int colObservacion = 4; // fallback: columna E
Row headerRow = sheet.getRow(10);
if (headerRow != null) {
    for (int c = 0; c < headerRow.getLastCellNum(); c++) {
        if (getCellText(headerRow.getCell(c), formatter).toUpperCase().contains("OBSERV")) {
            colObservacion = c;
            break;
        }
    }
}
```

Busca la primera celda cuyo texto (en mayúsculas) contenga `"OBSERV"`. Cubre: "OBSERVACION", "OBSERVACIÓN", "OBSERVACIONES". Si no encuentra ninguna, usa el índice 4 (columna E) como fallback.

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
        int totalNoEncontrados,
        int numeroSemanaExcel        // número de semana leída (ej: 3 para "SEMANA (3)"), 0 si no se pudo detectar
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
        @RequestParam("archivo") MultipartFile archivo,
        @RequestParam(value = "numeroSemana", required = false) Integer numeroSemana) {
    return ResponseEntity.status(200)
            .body(pedidoSemanaBodegaService.importarExcelProductos(archivo, numeroSemana));
}
```

`numeroSemana` es opcional (query param `?numeroSemana=X`). Si viene → se lee la hoja `SEMANA (X)` por nombre. Si no → se usa la hoja activa.

### Seguridad (`SpringSecurityConfig.java`)

```java
.requestMatchers(HttpMethod.POST, "/api/v*/pedido-semana-bodega/importar-excel")
.hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO")
```

### Interfaz del servicio

**Archivo:** `backend/.../services/PedidoSemanaBodegaService.java`

```java
ImportarExcelResultado importarExcelProductos(MultipartFile archivo, Integer numeroSemana);
```

### Lógica de parseo (`PedidoSemanaBodegaServiceImp.java`)

Flujo completo del método `importarExcelProductos(archivo, numeroSemana)`:

```java
// 1. Selección de hoja
Sheet sheet;
if (numeroSemana != null) {
    // Usuario eligió una hoja desde el modal del frontend
    String nombreHoja = "SEMANA (" + numeroSemana + ")";
    sheet = workbook.getSheet(nombreHoja);
    if (sheet == null) throw new PedidoSemanaBodegaException("No se encontró la hoja '" + nombreHoja + "'", BAD_REQUEST);
    numeroSemanaExcel = numeroSemana;
} else {
    // Un solo archivo o sin selección → usar hoja activa
    int activeIdx = workbook.getActiveSheetIndex();
    sheet = workbook.getSheetAt(activeIdx);
    // Parsear número de semana del nombre: "SEMANA (3)" → 3
    Matcher m = Pattern.compile("\\((\\d+)\\)").matcher(sheet.getSheetName());
    if (m.find()) numeroSemanaExcel = Integer.parseInt(m.group(1));
}

// 2. Detectar columna de observación desde cabecera (fila 11 Excel = índice 10 POI)
int colObservacion = 4; // fallback columna E
Row headerRow = sheet.getRow(10);
if (headerRow != null) {
    for (int c = 0; c < headerRow.getLastCellNum(); c++) {
        if (getCellText(headerRow.getCell(c), formatter).toUpperCase().contains("OBSERV")) {
            colObservacion = c; break;
        }
    }
}

// 3. Iterar filas de datos (fila 12→80, índices 11→79)
for (int i = 11; i <= 79; i++) {
    Row row = sheet.getRow(i);
    if (row == null) continue;

    String celdaA = getCellText(row.getCell(0), formatter);
    String celdaB = getCellText(row.getCell(1), formatter);
    String celdaC = getCellText(row.getCell(2), formatter);
    if (celdaA.isBlank() && celdaB.isBlank() && celdaC.isBlank()) continue;

    String nombreParaBusqueda = StringUtils.capitalizarPalabras(celdaB);
    BigDecimal cantidad       = parseCantidad(row.getCell(3));
    String celdaObs = getCellText(row.getCell(colObservacion), formatter);
    String observacion = celdaObs.isBlank() ? null : StringUtils.normalizeSpaces(celdaObs);

    Optional<Producto> productoOpt =
        productoRepository.findByNombreProductoAndActivo(nombreParaBusqueda, true);
    // → estado "ok" o "no_encontrado"
}

// 4. Retornar
return new ImportarExcelResultado(resultados, totalOk, totalNoEncontrados, numeroSemanaExcel);
```

La unidad de medida NO se lee del Excel (col C); se obtiene de la relación JPA:
`producto.getUnidadMedida().getNombreUnidad()`

### Métodos privados del Service

```java
private String getCellText(Cell cell, DataFormatter formatter) {
    if (cell == null) return "";
    return formatter.formatCellValue(cell).trim();
}

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

---

## Implementación frontend — COMPLETADA

### Tipos (`frontend/src/types/receta.types.ts`)

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
  numeroSemanaExcel: number;  // número de semana leída (0 si no detectado)
}
```

### Servicio (`frontend/src/services/receta-service.ts`)

```typescript
export const importarExcelPedidoService = async (
  archivo: File,
  numeroSemana?: number          // opcional: fuerza lectura de SEMANA (X)
): Promise<IImportarExcelResultado> => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const params = numeroSemana ? `?numeroSemana=${numeroSemana}` : '';
  const response = await api.post<IImportarExcelResultado>(
    `/pedido-semana-bodega/importar-excel${params}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};
```

### Flujo de importación (`frontend/src/pages/pedido-semanal-a-bodega.tsx`)

#### Dependencia añadida

```typescript
import * as XLSX from 'xlsx'; // ya incluido en el proyecto (xlsx 0.18.5)
```

#### Función utilitaria (fuera del componente)

```typescript
// Lee solo los nombres de hojas sin parsear celdas — muy rápido en archivos grandes
const leerNombresHojas = (file: File): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', bookSheets: true });
      resolve(wb.SheetNames);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
```

#### Estados en `DetalleReceta`

```typescript
const { semanas } = usePeriodoSemana();          // para mostrar fechas en el modal
const [isImporting, setIsImporting] = React.useState(false);
const [pendingFile, setPendingFile] = React.useState<File | null>(null);
const [sheetOptions, setSheetOptions] = React.useState<string[]>([]); // hojas SEMANA (X) detectadas
const { isOpen: isSheetOpen, onOpen: onSheetOpen, onClose: onSheetClose } = useDisclosure();
```

#### Flujo al seleccionar archivo

```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  setIsImporting(true);
  try {
    const allSheets = await leerNombresHojas(file);
    const semanaSheets = allSheets.filter(n => /^SEMANA \(\d+\)$/.test(n));

    if (semanaSheets.length <= 1) {
      // Una sola hoja SEMANA → importar directamente sin preguntar
      const num = semanaSheets.length === 1
        ? parseInt(semanaSheets[0].match(/\((\d+)\)/)?.[1] || '0') || undefined
        : undefined;
      await doImport(file, num);
    } else {
      // Varias hojas SEMANA → mostrar modal de selección
      setIsImporting(false);
      setPendingFile(file);
      setSheetOptions(semanaSheets);
      onSheetOpen();
    }
  } catch {
    setIsImporting(false);
    toast.error('No se pudo leer el archivo Excel');
  }
};

const handleSelectSheet = async (sheetName: string) => {
  onSheetClose();
  const num = parseInt(sheetName.match(/\((\d+)\)/)?.[1] || '0') || undefined;
  if (pendingFile) await doImport(pendingFile, num);
};
```

#### Modal de selección de semana

Se renderiza dentro del `<>` fragment de `DetalleReceta`, antes del `ModalHeader` principal.
Muestra una grilla 3 columnas con botones por cada hoja `SEMANA (X)` detectada.
Cada botón muestra el número de semana y el rango de fechas del contexto `usePeriodoSemana`
(usando posición `semanas[num - 1]`).

#### Función `doImport` — lógica post-selección

```typescript
const doImport = async (file: File, numeroSemana?: number) => {
  setIsImporting(true);
  const resultado = await importarExcelPedidoService(file, numeroSemana);

  // Poblar ingredientes en el formulario
  if (resultado.totalOk > 0) formRef.current?.importarDesdeExcel(resultado.resultados);

  // Auto-seleccionar semana en el formulario
  if (resultado.numeroSemanaExcel > 0) formRef.current?.setSemanaDesdeNumero(resultado.numeroSemanaExcel);

  // Toasts de resultado
  // ...
};
```

#### Métodos expuestos en `FormularioReceta` via `useImperativeHandle`

```typescript
// Agrega los productos importados a la lista de ingredientes
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
  if (nuevos.length > 0) setIngredientes(prev => [...prev, ...nuevos]);
},

// Selecciona automáticamente la semana correspondiente en el formulario
// Usa posición: semanas[numeroSemana - 1] del contexto usePeriodoSemana
setSemanaDesdeNumero: (numeroSemana: number) => {
  if (numeroSemana >= 1 && numeroSemana <= semanas.length) {
    const semanaTarget = semanas[numeroSemana - 1];
    if (semanaTarget) setIdSemana(String(semanaTarget.idSemana));
  }
},
```

---

## Bugs encontrados y corregidos

### Bug 1 — Producto buscado con string vacío (sesión 2)

**Síntoma:** Backend retornaba 0 encontrados, 69 no encontrados. Logs: `binding parameter (1:VARCHAR) <- []`

**Causa:** El código leía `row.getCell(0)` (columna A, siempre vacía) en lugar de `row.getCell(1)` (columna B).

**Fix:** Cambiar `celdaA` → `celdaB` para `nombreExcel` y `nombreParaBusqueda`.

### Bug 2 — Leyendo hoja incorrecta (sesión 2)

**Síntoma:** Backend leía nombres correctos pero de la hoja equivocada. Solo 1 de 69 encontrado.

**Causa:** `workbook.getSheetAt(0)` siempre lee "LISTADO PRODUCTOS", no la hoja SEMANA activa.

**Fix:** Usar `workbook.getSheetAt(workbook.getActiveSheetIndex())`.

---

## Estado actual

### Backend
- [x] Dependencia Apache POI en `pom.xml`
- [x] Record `ImportarExcelResultado` con `ResultadoItem` anidado y campo `numeroSemanaExcel`
- [x] Método `importarExcelProductos(archivo, numeroSemana)` en `PedidoSemanaBodegaServiceImp`
- [x] Selección de hoja por nombre `SEMANA (X)` cuando `numeroSemana` es provisto; hoja activa como fallback
- [x] Detección dinámica de columna de observación desde cabecera (fila 11 Excel)
- [x] Endpoint `POST /api/v1/pedido-semana-bodega/importar-excel?numeroSemana=X`
- [x] Regla en `SpringSecurityConfig` (sin 403)
- [x] Logs detallados (hoja seleccionada, columna observación, cada fila)

### Frontend
- [x] Import de `xlsx` para lectura de nombres de hojas en el cliente
- [x] Función `leerNombresHojas(file)` con `bookSheets: true` (no parsea celdas, rápido)
- [x] Flujo: selección de archivo → detección de hojas SEMANA → modal si hay varias → `doImport`
- [x] Modal de selección de semana con grilla 3 columnas + fechas del contexto `usePeriodoSemana`
- [x] Botón "Importar Excel" en `ModalFooter` (sin input de número manual)
- [x] `importarExcelPedidoService(archivo, numeroSemana?)` con query param opcional
- [x] Tipos `IResultadoItemExcel` / `IImportarExcelResultado` (con `numeroSemanaExcel`) en `receta.types.ts`
- [x] Método `importarDesdeExcel()` — puebla ingredientes del formulario
- [x] Método `setSemanaDesdeNumero()` — auto-selecciona la semana en el selector del formulario
- [x] **Funcional en entorno de desarrollo**
