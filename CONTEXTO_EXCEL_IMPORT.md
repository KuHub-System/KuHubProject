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
- Si el usuario seleccionó una hoja en el modal del frontend → backend busca esa hoja por nombre exacto (puede ser cualquier nombre: `SEMANA (X)`, `LISTADO PRODUCTOS`, o nombres personalizados).
- Si no se especificó (caso de un solo archivo con una sola hoja) → backend usa `workbook.getActiveSheetIndex()`.
- El `numeroSemanaExcel` se extrae automáticamente del nombre con regex `\((\d+)\)`: si el nombre es `SEMANA (5)` → `numeroSemanaExcel = 5`. Si el nombre no coincide → `numeroSemanaExcel = 0` (no auto-selecciona semana).

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
        int numeroSemanaExcel,       // número de semana leída (ej: 3 para "SEMANA (3)"), 0 si no se pudo detectar
        String preparaciones         // datos de PREPARACIONES desde fila 7 col B + fila 8 cols B+C, null si no existe
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
        @RequestParam(value = "nombreHoja", required = false) String nombreHoja) {
    return ResponseEntity.status(200)
            .body(pedidoSemanaBodegaService.importarExcelProductos(archivo, nombreHoja));
}
```

`nombreHoja` es opcional (query param `?nombreHoja=<nombre>`). Si viene → se lee esa hoja por nombre exacto (puede ser cualquier nombre). Si no → se usa la hoja activa. Ejemplo: `?nombreHoja=SEMANA%20(5)` o `?nombreHoja=LISTADO%20PRODUCTOS`.

### Seguridad (`SpringSecurityConfig.java`)

```java
.requestMatchers(HttpMethod.POST, "/api/v*/pedido-semana-bodega/importar-excel")
.hasAnyRole("ADMINISTRADOR", "CO_ADMINISTRADOR", "PROFESOR_A_CARGO")
```

### Interfaz del servicio

**Archivo:** `backend/.../services/PedidoSemanaBodegaService.java`

```java
ImportarExcelResultado importarExcelProductos(MultipartFile archivo, String nombreHoja);
```

### Lógica de parseo (`PedidoSemanaBodegaServiceImp.java`)

Flujo completo del método `importarExcelProductos(archivo, nombreHoja)`:

```java
// 1. Selección de hoja por nombre exacto o hoja activa
Sheet sheet;
if (nombreHoja != null && !nombreHoja.isBlank()) {
    // Usuario seleccionó una hoja por nombre exacto (puede ser cualquier nombre)
    sheet = workbook.getSheet(nombreHoja);
    if (sheet == null) throw new PedidoSemanaBodegaException("No se encontró la hoja '" + nombreHoja + "'", BAD_REQUEST);
} else {
    // Sin selección → usar hoja activa
    int activeIdx = workbook.getActiveSheetIndex();
    sheet = workbook.getSheetAt(activeIdx);
}

// 2. Extraer número de semana si el nombre coincide con "SEMANA (X)"
Matcher m = Pattern.compile("\\((\\d+)\\)").matcher(sheet.getSheetName());
if (m.find()) numeroSemanaExcel = Integer.parseInt(m.group(1));

// 2.5 Detectar PREPARACIONES en fila 7 Excel (índice 6 POI), col B para etiqueta
//     Si existe "PREPARACIONES", leer fila 8 cols B + C y concatenar normalizando espacios
String preparaciones = null;
Row prepLabelRow = sheet.getRow(6);
if (prepLabelRow != null) {
    String etiqueta = getCellText(prepLabelRow.getCell(1), formatter);
    if (etiqueta.toUpperCase().contains("PREPARACIONES")) {
        Row prepDataRow = sheet.getRow(7);
        if (prepDataRow != null) {
            String colB = getCellText(prepDataRow.getCell(1), formatter);
            String colC = getCellText(prepDataRow.getCell(2), formatter);
            String combinado = (colB + " " + colC).trim();
            if (!combinado.isBlank()) {
                preparaciones = StringUtils.normalizeSpaces(combinado);
            }
        }
    }
}

// 3. Detectar columna de observación desde cabecera (fila 11 Excel = índice 10 POI)
int colObservacion = 4; // fallback columna E
Row headerRow = sheet.getRow(10);
if (headerRow != null) {
    for (int c = 0; c < headerRow.getLastCellNum(); c++) {
        if (getCellText(headerRow.getCell(c), formatter).toUpperCase().contains("OBSERV")) {
            colObservacion = c; break;
        }
    }
}

// 4. Iterar filas de datos (fila 12→80, índices 11→79)
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

// 5. Retornar (incluye preparaciones si fue detectado)
return new ImportarExcelResultado(resultados, totalOk, totalNoEncontrados, numeroSemanaExcel, preparaciones);
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
  preparaciones?: string;     // datos de PREPARACIONES (fila 7 + fila 8), null si no existe
}
```

### Servicio (`frontend/src/services/receta-service.ts`)

```typescript
export const importarExcelPedidoService = async (
  archivo: File,
  nombreHoja?: string            // opcional: nombre exacto de la hoja a leer
): Promise<IImportarExcelResultado> => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const params = nombreHoja ? `?nombreHoja=${encodeURIComponent(nombreHoja)}` : '';
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
const [sheetOptions, setSheetOptions] = React.useState<string[]>([]); // todas las hojas detectadas
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

    if (allSheets.length <= 1) {
      // Una sola hoja → importar directamente sin preguntar
      await doImport(file, allSheets[0]);
    } else {
      // Múltiples hojas → mostrar modal de selección con todas ellas
      setIsImporting(false);
      setPendingFile(file);
      setSheetOptions(allSheets);
      onSheetOpen();
    }
  } catch {
    setIsImporting(false);
    toast.error('No se pudo leer el archivo Excel');
  }
};

const handleSelectSheet = async (sheetName: string) => {
  onSheetClose();
  if (pendingFile) await doImport(pendingFile, sheetName);  // pasar el nombre exacto
};
```

#### Modal de selección de hojas

**CAMBIO (2026-05-07):** Muestra todas las hojas detectadas, no solo las SEMANA.

Se renderiza dentro del `<>` fragment de `DetalleReceta`, antes del `ModalHeader` principal.
Muestra una grilla 3 columnas con botones por cada hoja detectada:
- Si el nombre coincide con `SEMANA (X)` → muestra "Semana X" + rango de fechas
- Si el nombre no coincide → muestra el nombre tal como está (ej: "LISTADO PRODUCTOS")

#### Modal de productos no encontrados

**NUEVO (2026-05-08):** Reemplaza el toast de no-encontrados con un modal flotante detallado.

Se abre cuando `resultado.totalNoEncontrados > 0`. Muestra:
- Header con icono de alerta y cantidad de productos no encontrados
- Lista scrollable (max-height 320px) de productos no encontrados, cada uno con:
  - Nombre del producto (desde `nombreExcel`)
  - Cantidad (si existe en el Excel)
  - Observación (si existe en el Excel)
  - Número de fila donde aparece
- Botón "Entendido" para cerrar

Esto permite que el usuario revise todos los detalles del producto no encontrado (nombre, cantidad, observación, fila) para investigar y corregir manualmente si es necesario.

#### Función `doImport` — lógica post-selección

```typescript
const doImport = async (file: File, nombreHoja?: string) => {
  setIsImporting(true);
  const resultado = await importarExcelPedidoService(file, nombreHoja);

  // Poblar ingredientes en el formulario
  if (resultado.totalOk > 0) formRef.current?.importarDesdeExcel(resultado.resultados);

  // Auto-seleccionar semana en el formulario
  if (resultado.numeroSemanaExcel > 0) formRef.current?.setSemanaDesdeNumero(resultado.numeroSemanaExcel);

  // Auto-cargar PREPARACIONES en descripción (si existen en fila 7+8 del Excel)
  if (resultado.preparaciones && formRef.current?.setDescripcionDesdeExcel) {
    formRef.current.setDescripcionDesdeExcel(resultado.preparaciones);
  }

  // Toast de productos ok
  if (resultado.totalOk > 0) toast.success("N productos importados correctamente");

  // Modal flotante de productos no encontrados (en lugar de toast)
  if (resultado.totalNoEncontrados > 0) {
    const noEncontrados = resultado.resultados.filter(r => r.estado === 'no_encontrado');
    setNoEncontradosResultados(noEncontrados);
    onNoEncontradosOpen(); // abre modal con lista detallada
  }
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

// Carga automáticamente PREPARACIONES en el campo "Descripción (opcional)"
// Se ejecuta si el backend detectó PREPARACIONES en fila 7 col B + fila 8 cols B+C
setDescripcionDesdeExcel: (valor: string) => {
  setDescripcion(valor);
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

## Flujo visual — Paso a paso (Frontend)

```
Usuario abre modal "Nuevo Pedido Semanal"
        ↓
    [ModalFooter]
    Botón "Importar Excel" → onClick: fileInputRef.current?.click()
        ↓
Usuario selecciona archivo (.xlsx, .xlsm, .xls)
        ↓
    handleFileChange() [línea 781]
        ├─ setIsImporting(true)
        ├─ leerNombresHojas(file) [línea 705]
        │   └─ Devuelve: ['LISTADO PRODUCTOS', 'SEMANA (1)', 'SEMANA (2)', ..., 'SEMANA (18)']
        └─ Usar TODAS las hojas (sin filtro)
                ↓
        ¿Cuántas hojas en total?
            │
            ├─ 0 ó 1 hojas
            │   └─ doImport(file, nombreHoja) [línea 744]
            │       └─ setIsImporting(false)
            │
            └─ 2+ hojas
                ├─ setIsImporting(false)
                ├─ setPendingFile(file)
                ├─ setSheetOptions(allSheets)  // todas las hojas
                ├─ onSheetOpen() → Modal visible [línea 823]
                │
                └─ Usuario selecciona una hoja en el modal
                    └─ handleSelectSheet(sheetName) [línea 808]
                        ├─ onSheetClose()
                        └─ doImport(pendingFile, sheetName)  // nombre exacto
                            ↓
                        importarExcelPedidoService(file, "SEMANA (5)") [línea 749]
                            ↓
                        POST /api/v1/pedido-semana-bodega/importar-excel?nombreHoja=SEMANA%20(5)
                            ↓
                        [BACKEND PROCESA]
                            ↓
                        Respuesta: ImportarExcelResultado
                        {
                          resultados: [
                            { fila: 12, nombreExcel: "ABARROTES", idProducto: null, estado: "no_encontrado" },
                            { fila: 13, nombreExcel: "ACEITE OLIVA EXTRA VIRGEN", idProducto: 42, 
                              nombreProducto: "Aceite Oliva Extra Virgen", cantidad: 2500, 
                              observacion: "Primera opción", estado: "ok" },
                            ...
                          ],
                          totalOk: 65,
                          totalNoEncontrados: 4,
                          numeroSemanaExcel: 5
                        }
                            ↓
                        [FRONTEND PROCESA RESULTADO]
                            ├─ formRef.current?.importarDesdeExcel(resultado.resultados)
                            │   └─ Agrega 65 ingredientes a setIngredientes
                            │       (consolidando duplicados en el submit)
                            │
                            ├─ Si resultado.numeroSemanaExcel > 0:
                            │   ├─ formRef.current?.setSemanaDesdeNumero(resultado.numeroSemanaExcel)
                            │   │   └─ Auto-selecciona semana en el selector
                            │   │
                            │   └─ (Para hojas no-SEMANA: numeroSemanaExcel=0 → no auto-selecciona)
                            │
                            ├─ toast.success("65 productos importados correctamente")
                            │
                            └─ toast.warning("No encontrados: ABARROTES, PRODUCTO A, ...")
                                    ↓
                        Usuario ve:
                        ┌─────────────────────────────────┐
                        │ Formulario Pedido Semanal       │
                        │                                 │
                        │ Nombre: [________]              │
                        │ Descripción: [_______]          │
                        │ Semana: [Semana 5 (15-21 may)]  │
                        │                                 │
                        │ Ingredientes: 65 productos ✓    │
                        │ [Tabla con ingredientes]        │
                        │                                 │
                        │ [Cancelar] [Importar Excel] [Guardar]
                        └─────────────────────────────────┘
```

---

## Estados locales del componente `DetalleReceta` [línea 721]

```typescript
const DetalleReceta: React.FC<DetalleRecetaProps> = ({ receta, mode, productos, onClose, onSave }) => {
  // Modal de selección de semanas
  const [isImporting, setIsImporting] = React.useState(false);           // ¿Procesando archivo?
  const [pendingFile, setPendingFile] = React.useState<File | null>(null); // Archivo esperando selección
  const [sheetOptions, setSheetOptions] = React.useState<string[]>([]); // ["SEMANA (1)", "SEMANA (2)", ...]
  const { isOpen: isSheetOpen, onOpen: onSheetOpen, onClose: onSheetClose } = useDisclosure();
  
  // Referencias
  const formRef = React.useRef<any>(null);        // FormularioReceta expuesto
  const fileInputRef = React.useRef<HTMLInputElement>(null); // Input file hidden
```

---

## Ubicación en el código — archivo principal

**Archivo:** `frontend/src/pages/pedido-semanal-a-bodega.tsx`

| Sección | Líneas | Descripción |
|---------|--------|-------------|
| Función `leerNombresHojas` | 705-719 | Lee nombres de hojas sin parsear celdas (rápido) |
| Componente `DetalleReceta` | 721-942 | Modal con formulario e importación |
| Modal de selección de semana | 823-873 | Grilla 3 cols con botones de semanas |
| `handleFileChange` | 781-806 | Entrada de archivo + lógica condicional |
| `handleSelectSheet` | 808-812 | Usuario selecciona semana del modal |
| `doImport` | 744-779 | Llama API + puebla formulario + toasts |
| `ModalFooter` (input file) | 902-908 | Input hidden con accept types |
| `ModalFooter` (botón Excel) | 914-925 | Botón "Importar Excel" |
| `FormularioReceta.importarDesdeExcel` | 1278-1292 | Agrega ingredientes importados |
| `FormularioReceta.setSemanaDesdeNumero` | 1294-1301 | Auto-selecciona semana |

---

## Caso de uso típico — Importar Excel en modo CREAR

```
ESCENARIO:
Usuario (Profesor a Cargo) quiere crear un "Pedido Semanal" para la Semana 5
mediante importación de Excel. El archivo tiene 18 hojas SEMANA (1)...SEMANA (18).

PASO 1: Abrir modal
────────────────────
Hace clic en "Nuevo Pedido Semanal" [línea 513]
  → abre Modal [línea 662]
  → mode='crear'
  → receta=null
  → Se renderiza DetalleReceta [línea 676]

PASO 2: Seleccionar archivo
────────────────────────────
En el ModalFooter, hace clic en "Importar Excel" [línea 917]
  → onClick={() => fileInputRef.current?.click()}
  → Se abre dialog de archivo
  → Selecciona "CHOCOLATERÍA LISTADO PEDIDO 2025.xlsm"

PASO 3: Sistema detecta múltiples hojas
───────────────────────────────────────
handleFileChange [línea 781]:
  • leerNombresHojas() retorna 19 hojas
  • Filtra: ['SEMANA (1)', 'SEMANA (2)', ..., 'SEMANA (18)']
  • Encuentra 18 hojas SEMANA
  • Como > 1, abre modal de selección [línea 823]

PASO 4: Usuario selecciona Semana 5
────────────────────────────────────
Modal muestra grilla [línea 842]:
  ┌──────┬──────┬──────┐
  │ Sem1 │ Sem2 │ Sem3 │  (botones con fechas del contexto)
  │15-21 │22-28 │29-4  │
  └──────┴──────┴──────┘
  │ Sem4 │ Sem5 │ Sem6 │
  │5-11  │12-18 │19-25 │  ← Usuario hace clic aquí
  └──────┴──────┴──────┘

handleSelectSheet("SEMANA (5)") [línea 808]:
  • Extrae número 5 del nombre
  • Llama doImport(pendingFile, 5)

PASO 5: Backend procesa y retorna resultados
──────────────────────────────────────────────
doImport(file, 5) [línea 744]:
  POST /api/v1/pedido-semana-bodega/importar-excel?numeroSemana=5

Backend (SpringBoot):
  1. Lee hoja "SEMANA (5)"
  2. Detecta columna observación en fila 11
  3. Parsea filas 12-80
  4. Busca cada producto en BD
  5. Retorna:
     {
       resultados: [
         { fila: 12, nombreExcel: "ACEITE OLIVA EXTRA VIRGEN", idProducto: 42, 
           nombreProducto: "Aceite Oliva Extra Virgen", cantidad: 2500, 
           nombreUnidadMedida: "ml", observacion: "Primera opción", estado: "ok" },
         { fila: 13, nombreExcel: "ABARROTES", idProducto: null, estado: "no_encontrado" },
         ...
       ],
       totalOk: 65,
       totalNoEncontrados: 4,
       numeroSemanaExcel: 5
     }

PASO 6: Frontend puebla formulario
──────────────────────────────────
doImport continúa [línea 751]:
  • resultado.totalOk=65 > 0
  • formRef.current.importarDesdeExcel(resultado.resultados)
    └─ Crea 65 IIngrediente y llama setIngredientes

FormularioReceta.importarDesdeExcel [línea 1278]:
  const nuevos = resultados
    .filter(r => r.estado === 'ok' && r.idProducto != null)
    .map(r => ({
      id: `excel_${r.fila}_${r.idProducto}_${Math.random().toString(36).slice(2)}`,
      productoId: r.idProducto!.toString(),     // "42"
      productoNombre: r.nombreProducto,         // "Aceite Oliva Extra Virgen"
      cantidad: r.cantidad,                     // 2500
      unidadMedida: r.nombreUnidadMedida,       // "ml"
      observacion: r.observacion                // "Primera opción"
    }));
  setIngredientes(prev => [...prev, ...nuevos]);

PASO 7: Auto-selecciona semana
───────────────────────────────
doImport continúa [línea 758]:
  • resultado.numeroSemanaExcel=5 > 0
  • formRef.current.setSemanaDesdeNumero(5)

FormularioReceta.setSemanaDesdeNumero [línea 1294]:
  const semanaTarget = semanas[5-1];  // semanas[4]
  setIdSemana(String(semanaTarget.idSemana));  // ej: "412"
  • Selector de semana ahora muestra "Semana 5 (12 may – 18 may)" ✓

PASO 8: Toasts informativos
─────────────────────────────
doImport finaliza [línea 753-769]:
  • toast.success("65 productos importados correctamente")
  • Filtra resultados con estado='no_encontrado'
  • toast.warning("No encontrados: ABARROTES, PRODUCTO B, PRODUCTO C, PRODUCTO D")

PASO 9: Usuario completa el formulario
───────────────────────────────────────
El modal ahora muestra:

┌──────────────────────────────────┐
│ Nuevo Pedido Semanal             │
├──────────────────────────────────┤
│                                  │
│ Nombre: [Pedido Semana 5      ]  │
│ Descripción: [Choco pedido    ]  │
│ Semana: [Semana 5 (12-18 may) ]  │
│                                  │
│ Ingredientes: 65 agregados       │
│ [Tabla con ingredientes de Excel]│
│ - Aceite Oliva Extra Virgen, 2500, ml, "Primera opción" ✓
│ - Azúcar Blanca, 1500, kg, "Marca X" ✓
│ - Harina Premium, 3000, kg, "" ✓
│ ...                              │
│                                  │
│ Estado: [Activo ▼]               │
│                                  │
│ [Cancelar] [Importar Excel] [Crear Pedido Semanal]
└──────────────────────────────────┘

Usuario completa campos requeridos:
  • Nombre: "Pedido Semana 5 - Chocolate"
  • Descripción: (opcional)
  • Estado: Activo (por defecto)
  • Ingredientes: Ya están (65 de Excel)

PASO 10: Enviar formulario
───────────────────────────
Usuario hace clic [Crear Pedido Semanal]
  → handleSubmit [línea 733]
  → formRef.current.submit()

FormularioReceta.submit [línea 1303]:
  1. Valida:
     - Nombre no vacío
     - ≥1 ingrediente
     - Todos tienen producto y cantidad > 0
  2. Consolida duplicados:
     (Si usuario agregó el mismo producto 2 veces, suma cantidades)
  3. Construye payload:
     {
       id: "",
       nombre: "Pedido Semana 5 - Chocolate",
       descripcion: "...",
       ingredientes: [ 65 consolidados ],
       estado: "Activo",
       idSemana: 412
     }
  4. Llama onSave(recetaData)

handleGuardarReceta [línea 267]:
  Como mode='crear':
    crearRecetaConDetallesService({
      nombrePedido: "Pedido Semana 5 - Chocolate",
      descripcionPedido: "...",
      listaItems: [ 65 items con idProducto, cantUnidadMedida, observacion ],
      estadoPedido: "Activo",
      idSemana: 412
    })
    POST /api/v1/pedido-semana-bodega (create endpoint)

Backend persiste en BD:
  INSERT INTO pedido_semana_bodega (nombre, descripcion, estado, id_semana) → ID 1234
  INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, observacion) x65

PASO 11: Confirmación
──────────────────────
toast.success("Pedido Semanal creada correctamente")
Modal cierra
Recarga tabla de pedidos (cargarDatosIniciales)
  → Usuario ve su nuevo pedido en la lista
```

---

## Caso de uso típico — Editar Excel en modo EDITAR

```
ESCENARIO:
Usuario (Profesor a Cargo) quiere EDITAR un pedido existente.
Necesita importar nuevos ingredientes desde Excel y descartar algunos viejos.

PASO 1: Abrir modal en modo editar
──────────────────────────────────
Hace clic en el ícono editar de un pedido [línea 610]
  → handleEditarReceta(receta)
  → mode='editar'
  → receta={ idPedidoSemanaBodega: 1234, nombrePedido: "Pedido viejo", ... }
  → Se renderiza DetalleReceta [línea 676]

Diferencias respecto a 'crear':
  • El formulario se puebla con datos existentes [línea 1055-1199]
  • FormularioReceta mantiene snapshot de detalles originales [línea 1179]
  • Botón dice "Guardar Cambios" en lugar de "Crear Pedido Semanal"
  • Se detectan CAMBIOS para habilitar botón guardar [línea 1221-1275]

PASO 2: Usuario hace clic "Importar Excel"
───────────────────────────────────────────
Mismo flujo que en 'crear' [línea 917-925]
  → Selecciona archivo
  → Elige semana si hay múltiples
  → doImport llama API
  → Retorna 50 productos

PASO 3: Los 50 productos se SUMAN a los existentes
────────────────────────────────────────────────────
formRef.current.importarDesdeExcel(resultado.resultados) [línea 1290]:
  setIngredientes(prev => [...prev, ...nuevos]);  // ← SUMA, no reemplaza
  
Ahora ingredientes = [15 viejos] + [50 nuevos] = 65 total

PASO 4: Usuario puede eliminar ingredientes viejos
────────────────────────────────────────────────────
Para cada ingrediente viejo que quiere eliminar:
  Hace clic en botón eliminar [línea 1726]
    → eliminarIngrediente(index) [línea 1465]
    → Si el producto estaba en BD (originalProductIdsRef):
       setDeletedProductIds(prev => [...prev, idProducto])  // Marca para borrar
    → setIngredientes(filtro)  // Quita de la UI

Ahora ingredientes = 55 total
deletedProductIds = [X, Y, Z]  // Productos a eliminar de la BD

PASO 5: Enviar cambios
──────────────────────
Usuario hace clic [Guardar Cambios]
  → handleSubmit → formRef.current.submit()

FormularioReceta.submit [línea 1354]:
  Como mode='editar':
    Detecta deltas respecto a BD:
    • newItems: 50 (productos nuevos del Excel)
    • updateItems: 0 (ninguno con cantidad modificada)
    • deleteItems: 3 (los que usuario eliminó: [X, Y, Z])
    
    Construye updatePayload:
    {
      idPedidoSemanaBodega: 1234,
      nombrePedido: "Pedido actualizado",
      descripcionPedido: "...",
      estadoPedido: "Activo",
      newItems: [ 50 items del Excel con idProducto, cant, obs ],
      updateItems: [],
      deleteItems: [X, Y, Z],  // IDs de PRODUCTOS a borrar
      idSemana: 412
    }
    
    Llama onSave(recetaData, updatePayload)

handleGuardarReceta [línea 287]:
  Como mode='editar':
    actualizarRecetaConDetallesService(updatePayload)
    PUT /api/v1/pedido-semana-bodega/{id}

Backend:
  • Actualiza nombre, descripción, estado, idSemana
  • INSERT 50 nuevos detalles
  • DELETE detalles con idProducto IN [X, Y, Z]
  • No toca los detalles existentes (no eliminados)

PASO 6: Confirmación
────────────────────
toast.success("Pedido Semanal actualizada correctamente")
Modal cierra
Recarga tabla (cargarDatosIniciales)
  → Usuario ve su pedido con:
    - 15 ingredientes viejos (menos los 3 eliminados)
    - 50 ingredientes nuevos del Excel
    - Total: 62 ingredientes
```

---

## Integración Frontend ↔ Backend — Flujo de datos

```
FRONTEND (React)                        BACKEND (Spring Boot)
════════════════════════════════════════════════════════════════

User input: archivo .xlsm
       │
       ├─ leerNombresHojas(file)
       │  └─ XLSX.read({ bookSheets: true })
       │     → Devuelve: ['LISTADO PRODUCTOS', 'SEMANA (1)', ...]
       │
       └─ Presenta modal si hay múltiples hojas
             │
             └─ Usuario selecciona hoja
                    │
                    ├─ FormData { archivo, nombreHoja: "SEMANA (5)" }
                    └─────────────────────────────────────→
                                                POST /api/v1/pedido-semana-bodega/importar-excel
                                                ?nombreHoja=SEMANA%20(5)
                                                   │
                                                   ├─ PedidoSemanaBodegaController
                                                   │  .importarExcel(archivo, "SEMANA (5)")
                                                   │     │
                                                   │     ├─ pedidoSemanaBodegaService
                                                   │     │  .importarExcelProductos(archivo, "SEMANA (5)")
                                                   │     │     │
                                                   │     │     ├─ XSSFWorkbook wb = new XSSFWorkbook(archivo)
                                                   │     │     ├─ Sheet sheet = wb.getSheet("SEMANA (5)")
                                                       │     │     ├─ [NUEVO] Detecta PREPARACIONES fila 7 col B
                                                   │     │     │   └─ Si existe, concatena fila 8 cols B+C
                                                   │     │     ├─ Detecta columna observación (fila 11)
                                                   │     │     ├─ FOR fila 12-80:
                                                   │     │     │   ├─ Lee cols A, B, C, D, observación
                                                   │     │     │   ├─ Busca producto por nombre en BD
                                                   │     │     │   └─ Crea ResultadoItem
                                                   │     │     │       (fila, nombreExcel, idProducto, estado)
                                                   │     │     │
                                                   │     │     └─ RETURN ImportarExcelResultado
                                                   │     │        {
                                                   │     │          resultados: [...65 items...],
                                                   │     │          totalOk: 65,
                                                   │     │          totalNoEncontrados: 4,
                                                   │     │          numeroSemanaExcel: 5,
                                                   │     │          preparaciones: "Mezcla de... Hornear a..."  // [NUEVO]
                                                   │     │        }
                                                   │     │
                                                   │     └─ ResponseEntity.ok(resultado)
                                                   │
                    ←────────────────────────────────────
                    ImportarExcelResultado JSON
                    
       ├─ resultado.resultados.filter(r => r.estado === 'ok')
       ├─ formRef.current.importarDesdeExcel(resultados)
       │  └─ setIngredientes([...prev, ...nuevos])
       │
       ├─ formRef.current.setSemanaDesdeNumero(5)
       │  └─ setIdSemana("412")
       │
       ├─ [NUEVO] Si resultado.preparaciones existe:
       │  formRef.current.setDescripcionDesdeExcel(resultado.preparaciones)
       │  └─ setDescripcion(valor)
       │
       ├─ toast.success("65 productos importados")
       │
       ├─ [NUEVO] Si hay no-encontrados → Modal flotante con lista detallada
       │  setNoEncontradosResultados(noEncontrados)
       │  onNoEncontradosOpen() → Modal muestra:
       │                           ├─ Nombre producto (nombreExcel)
       │                           ├─ Cantidad
       │                           ├─ Observación
       │                           └─ Número de fila
       │
       └─ Usuario hace clic "Guardar"
              │
              ├─ submit() consolida duplicados
              ├─ FormData { nombrePedido, ingredientes, ... }
              └────────────────────────────────────────→
                                                POST /api/v1/pedido-semana-bodega (crear)
                                                o PUT (editar)
                                                   │
                                                   ├─ Persiste en BD
                                                   └─ RETURN { idPedidoSemanaBodega: 1234, ... }
                    ←────────────────────────────────────
                    PedidoSemanaBodega entity
       
       └─ toast.success("Pedido creado/actualizado")
```

---

## Estado actual

### Backend
- [x] Dependencia Apache POI en `pom.xml`
- [x] Record `ImportarExcelResultado` con `ResultadoItem` anidado y campos `numeroSemanaExcel`, `preparaciones`
- [x] Método `importarExcelProductos(archivo, String nombreHoja)` en `PedidoSemanaBodegaServiceImp`
- [x] Selección de hoja por nombre exacto (cualquier nombre) cuando `nombreHoja` es provisto; hoja activa como fallback
- [x] Extracción de `numeroSemanaExcel` con regex en todos los casos (0 si no coincide con patrón SEMANA)
- [x] Detección dinámica de columna de observación desde cabecera (fila 11 Excel)
- [x] **NUEVO (2026-05-08): Detección de PREPARACIONES en fila 7 col B (etiqueta) + fila 8 cols B+C (datos)**
- [x] Endpoint `POST /api/v1/pedido-semana-bodega/importar-excel?nombreHoja=<nombre>`
- [x] Regla en `SpringSecurityConfig` (sin 403)
- [x] Logs detallados (hoja seleccionada, columna observación, preparaciones, cada fila)

### Frontend
- [x] Import de `xlsx` para lectura de nombres de hojas en el cliente
- [x] Función `leerNombresHojas(file)` con `bookSheets: true` (no parsea celdas, rápido)
- [x] Flujo: selección de archivo → mostrar TODAS las hojas → modal si hay varias → `doImport`
- [x] Modal de selección de hojas con grilla 3 columnas (hojas SEMANA muestran fechas; otras muestran el nombre)
- [x] Botón "Importar Excel" en `ModalFooter` (sin input de número manual)
- [x] `importarExcelPedidoService(archivo, nombreHoja?)` con query param opcional (nombre exacto)
- [x] Tipos `IResultadoItemExcel` / `IImportarExcelResultado` (con `numeroSemanaExcel`, `preparaciones`) en `receta.types.ts`
- [x] Método `importarDesdeExcel()` — puebla ingredientes del formulario
- [x] Método `setSemanaDesdeNumero()` — auto-selecciona la semana solo si `numeroSemanaExcel > 0`
- [x] **NUEVO (2026-05-08): Método `setDescripcionDesdeExcel()` — carga automáticamente PREPARACIONES en el campo Descripción**
- [x] **NUEVO (2026-05-08): Modal de productos no encontrados — lista detallada (nombre, cantidad, observación, fila) en lugar de toast**
- [x] **Funcional en entorno de desarrollo (cambios aplicados 2026-05-07, mejoras 2026-05-08)**
