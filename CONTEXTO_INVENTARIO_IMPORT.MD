# Contexto: Sincronizar Inventario con Excel

## Resumen de la funcionalidad

El usuario sube `Planilla para inventario Abastecimiento 2026_1.xlsx` (u otro Excel del mismo
formato) desde la página de inventario. El frontend lee los nombres de hojas localmente,
muestra un modal con:

1. **Selección de hoja** (15 hojas disponibles)
2. **Categoría** del inventario (selector de categorías activas, con auto-match por nombre de hoja)
3. **Fila de inicio y fila de fin** reales del Excel (1-based)

El backend detecta dinámicamente cuáles columnas son el nombre y el stock, parsea el
rango y retorna resultados sin persistir. El frontend confirma y llama al bulk existente.

---

## Estructura real del Excel analizado

**Archivo:** `Planilla para inventario Abastecimiento 2026_1.xlsx`

### Hojas disponibles (15 hojas)

| Índice | Nombre hoja | Filas con datos | Header en fila | Observación |
|--------|-------------|-----------------|----------------|-------------|
| 0 | INVENTARIO | 549 | Fila 1 | Resumen general |
| 1 | PRODUCTOS SIN MOVIMIENTO | 67* | Fila 1* | Reporte multi-sección, **no apta para sync** |
| 2 | ESPECIEROS | 26 | **Fila 3** ← especial | Fila 2 = etiqueta "CONDIMENTOS" |
| 3 | ABARROTES | 708 | Fila 1 | Hoja principal con historial |
| 4 | INV ABARROTES | 583 | Fila 1 | Template de conteo (col stock vacía) |
| 5 | ASEO Y DESCARTABLE | 539 | Fila 1 | |
| 6 | INV CARNES Y PESCADOS | 67 | Fila 1 | Template de conteo |
| 7 | VINOS Y DESTILADOS | 542 | Fila 1 | |
| 8 | FRUTAS Y VERDURAS CONGELADAS | 476 | Fila 1 | Nombre en col D, no C |
| 9 | INV FRUTAS CONGELADAS | 31 | Fila 1 | Template de conteo |
| 10 | CARNES | 476 | Fila 1 | |
| 11 | PESCADOS Y MARISCOS | 473 | Fila 1 | |
| 12 | INV LICORES | 228 | Fila 1 | Template de conteo |
| 13 | UTENCILIOS | 479 | Fila 1 | |
| 14 | HERR1 | 419 | Fila 1 | |

---

### Estructura de columnas por hoja — todas las hojas analizadas

Las columnas son **variables por hoja**. El backend debe detectarlas dinámicamente.

#### Hojas principales (stock en col A = "TOTAL")

| Hoja | Col A | Col B | Col C | Col D |
|------|-------|-------|-------|-------|
| INVENTARIO | TOTAL | U/MEDIDA | **Insumo** (nombre) | UBICACIÓN |
| ABARROTES | TOTAL | U/MEDIDA | **Insumo** (nombre) | OBSERVACIONES |
| ASEO Y DESCARTABLE | TOTAL | U/MEDIDA | **INSUMO** (nombre) | Categoria |
| VINOS Y DESTILADOS | TOTAL | U/MEDIDA | **Insumo** (nombre) | COMENTARIO |
| CARNES | TOTAL | U/MEDIDA | **Insumo** (nombre) | INICIAL |
| PESCADOS Y MARISCOS | TOTAL | U/MEDIDA | **Insumo** (nombre) | INICIAL |
| UTENCILIOS | TOTAL | U/MEDIDA | **Insumo** (nombre) | UBICACIÓN |
| HERR1 | TOTAL | U/MEDIDA | **INSUMO** (nombre) | Ubicación |

#### Hojas con nombre en col diferente

| Hoja | Col A | Col B | Col C | Col D |
|------|-------|-------|-------|-------|
| FRUTAS Y VERDURAS CONGELADAS | TOTAL | PREELABORACIÓN | U/MEDIDA | **Insumo** (nombre) ← col D |

#### Hojas INV (templates de conteo — stock vacío hasta que usuario llena)

| Hoja | Col A | Col B | Col C | Col D |
|------|-------|-------|-------|-------|
| INV ABARROTES | U/MEDIDA | **Insumo** (nombre) | UBICACIÓN | INICIAL (stock) |
| INV CARNES Y PESCADOS | TOTAL | **Insumo** (nombre) | CANTIDAD (stock) | — |
| INV FRUTAS CONGELADAS | TOTAL | U/MEDIDA | **Insumo** (nombre) | INICIAL (stock) |
| INV LICORES | TOTAL | U/MEDIDA | **Insumo** (nombre) | cantidad (stock) |

#### ESPECIEROS (header en fila 3, datos desde fila 4)

| Col A | Col B | Col C | Col D |
|-------|-------|-------|-------|
| **CANTIDAD** (stock) | UNIDAD | **PRODUCTO** (nombre) | OBSERVACION |

---

## Algoritmo de detección dinámica de columnas (backend)

El backend NO usa índices hardcodeados. Lee el header row y detecta columnas:

**Regla del header row:**
```
headerRowPOI = filaInicio - 2   (filaInicio es 1-based → POI es 0-based → header está una fila antes)
```

> Ejemplo: usuario pone filaInicio=2 → headerRowPOI=0 (fila 1 del Excel)
> Ejemplo ESPECIEROS: usuario pone filaInicio=4 → headerRowPOI=2 (fila 3 del Excel)

**Detección del nombre (busca en la cabecera):**
```java
// Busca la primera columna cuyo encabezado contiene alguno de estos términos
boolean esColumnaNombre(String header) {
    String h = header.toUpperCase().strip();
    return h.contains("INSUMO") || h.contains("PRODUTO") || h.contains("PRODUCTO");
}
```

**Detección del stock (prioridad: TOTAL > CANTIDAD > INICIAL):**
```java
// Busca en orden de prioridad
int encontrarColumnaStock(Row headerRow) {
    int idxTotal = -1, idxCantidad = -1, idxInicial = -1;
    for (int c = 0; c < headerRow.getLastCellNum(); c++) {
        String h = getCellText(headerRow.getCell(c), formatter).toUpperCase().strip();
        if (h.equals("TOTAL") && idxTotal == -1)       idxTotal    = c;
        if (h.contains("CANTIDAD") && idxCantidad == -1) idxCantidad = c;
        if (h.equals("INICIAL") && idxInicial == -1)   idxInicial  = c;
        if (h.equals("CANTIDAD") && idxCantidad == -1) idxCantidad = c; // "cantidad" lowercase INV LICORES
    }
    if (idxTotal >= 0)    return idxTotal;
    if (idxCantidad >= 0) return idxCantidad;
    if (idxInicial >= 0)  return idxInicial;
    return 0; // fallback col A
}
```

**Resultado por hoja con este algoritmo:**

| Hoja | filaInicio sugerida | Col nombre detectada | Col stock detectada |
|------|--------------------|--------------------|-------------------|
| INVENTARIO | 2 | C (idx 2) "Insumo" | A (idx 0) "TOTAL" |
| ESPECIEROS | **4** | C (idx 2) "PRODUCTO" | A (idx 0) "CANTIDAD" |
| ABARROTES | 2 | C (idx 2) "Insumo" | A (idx 0) "TOTAL" |
| INV ABARROTES | 2 | B (idx 1) "Insumo" | D (idx 3) "INICIAL" |
| ASEO Y DESCARTABLE | 2 | C (idx 2) "INSUMO" | A (idx 0) "TOTAL" |
| VINOS Y DESTILADOS | 2 | C (idx 2) "Insumo" | A (idx 0) "TOTAL" |
| FRUTAS Y VERDURAS CONGELADAS | 2 | D (idx 3) "Insumo" | A (idx 0) "TOTAL" |
| CARNES | 2 | C (idx 2) "Insumo" | A (idx 0) "TOTAL" |
| PESCADOS Y MARISCOS | 2 | C (idx 2) "Insumo" | A (idx 0) "TOTAL" |
| INV CARNES Y PESCADOS | 2 | B (idx 1) "Insumo" | A (idx 0) "TOTAL" |
| INV FRUTAS CONGELADAS | 2 | C (idx 2) "Insumo" | D (idx 3) "INICIAL" |
| INV LICORES | 2 | C (idx 2) "Insumo" | D (idx 3) "cantidad" |
| UTENCILIOS | 2 | C (idx 2) "Insumo" | A (idx 0) "TOTAL" |
| HERR1 | 2 | C (idx 2) "INSUMO" | A (idx 0) "TOTAL" |

---

## Referencia de filaInicio y filaFin por hoja

| Hoja | filaInicio | filaFin real | Notas |
|------|-----------|-------------|-------|
| INVENTARIO | 2 | 550 | 549 filas de productos |
| ESPECIEROS | **4** | 29 | Header en fila 3. Fila 2 = "CONDIMENTOS" (label), ignorar |
| ABARROTES | 2 | 709 | 708 productos |
| INV ABARROTES | 2 | 584 | 583 productos, col INICIAL vacía hasta que usuario llene |
| ASEO Y DESCARTABLE | 2 | 541 | 539 productos |
| VINOS Y DESTILADOS | 2 | 543 | 542 productos |
| FRUTAS Y VERDURAS CONGELADAS | 2 | 477 | 476 productos, nombre en col D |
| CARNES | 2 | 477 | 476 productos |
| PESCADOS Y MARISCOS | 2 | 474 | 473 productos |
| INV CARNES Y PESCADOS | 2 | 68 | 67 productos, col CANTIDAD vacía |
| INV FRUTAS CONGELADAS | 2 | 32 | 31 productos, col INICIAL vacía |
| INV LICORES | 2 | 229 | 228 productos, col cantidad vacía |
| UTENCILIOS | 2 | 480 | 479 productos |
| HERR1 | 2 | 421 | 419 productos |

> **PRODUCTOS SIN MOVIMIENTO** = reporte multi-sección, no apta para sincronización.

---

## Lógica de skip de filas (backend)

```java
// Para cada fila en el rango [filaInicio, filaFin]:
String nombreCelda = getCellText(row.getCell(colNombre), formatter).trim();
BigDecimal stockCelda = parseCantidad(row.getCell(colStock));

// Skip 1: nombre vacío → ignorar silenciosamente
if (nombreCelda.isBlank()) continue;

// Skip 2: stock nulo → ignorar silenciosamente (hojas INV sin llenar)
if (stockCelda == null) continue;

// Solo llega aquí si tiene nombre Y stock → buscar en BD por categoría
```

---

## Modelo exitoso de referencia

Toda la arquitectura base se extrae de `CONTEXTO_EXCEL_IMPORT.md` (pedidosemanalabodega).
Diferencias clave:

| Aspecto | pedidosemanalabodega | inventario (nuevo) |
|---|---|---|
| Columnas | Fijas (hardcoded) | Dinámicas (detectadas del header) |
| Filas de datos | Fijas 12–80 | Dinámicas: usuario define inicio y fin |
| Modal | Solo selección de hoja | Hoja + **categoría** + fila inicio/fin |
| Resultado | Pobla lista ingredientes | Sincroniza stock en BD (bulk) |

---

## Ubicación del botón en el frontend

**Archivo:** `frontend/src/pages/inventario.tsx`
**Línea de referencia:** 645-694

```
[Control Masivo]  [Sincronizar con Excel ← NUEVO]  [Nuevo]  [ícono Categorías]  [ícono Unidades]
```

Permiso: `invPuedeCrear` — mismo guard que los botones adyacentes.

---

## Flujo del modal — Primera lectura

### Vista A — Selector de hojas (si 2+ hojas)

Lista simple de botones con los nombres reales de las hojas. NO mostrar grilla de fechas
(diferente a pedidosemanalabodega). Al clic en una hoja → intenta auto-match de categoría
y avanza a Vista B.

### Vista B — Configuración (siempre visible tras selección de hoja)

```
┌────────────────────────────────────────────────────┐
│  Sincronizar Inventario — Configuración            │
│  Hoja: ABARROTES                                   │
│                                                    │
│  Categoría *                                       │
│  [Abarrotes ▼]  ← auto si match; vacío si no      │
│                                                    │
│  Rango de filas del Excel                          │
│  Fila inicio: [ 2 ]     Fila fin: [709]            │
│                                                    │
│  Vista previa: 708 filas a procesar                │
│                                                    │
│  [← Volver]          [Procesar Excel →]            │
│               (disabled si categoría vacía)        │
└────────────────────────────────────────────────────┘
```

**Nota especial ESPECIEROS:** al seleccionar esa hoja → auto-set `filaInicio=4` (header en
fila 3). Mostrar al usuario un aviso: "Esta hoja tiene encabezado en fila 3. Inicio ajustado a 4."

---

## Auto-match de categoría (frontend)

```typescript
const normalizarParaMatch = (s: string): string =>
  s.toUpperCase()
   .normalize('NFD')
   .replace(/[̀-ͯ]/g, '')  // quitar tildes
   .trim();

const intentarAutoMatchCategoria = (
  nombreHoja: string,
  categorias: { id: number; nombre: string }[]
): number | null => {
  const normHoja = normalizarParaMatch(nombreHoja);
  const match = categorias.find(c => normalizarParaMatch(c.nombre) === normHoja);
  return match?.id ?? null;
};
```

---

## Auto-set de filaInicio al seleccionar ESPECIEROS

```typescript
const handleSeleccionarHojaExcel = (nombreHoja: string) => {
  setExcelSelectedSheet(nombreHoja);
  setExcelSelectedCatId(intentarAutoMatchCategoria(nombreHoja, categoriasActivas));

  // ESPECIEROS tiene header en fila 3, datos desde fila 4
  if (nombreHoja === 'ESPECIEROS') {
    setExcelFilaInicio(4);
    setExcelFilaFin(29);
  } else {
    setExcelFilaInicio(2);
    setExcelFilaFin(500); // default conservador, usuario ajusta
  }
  setExcelModalVista('config');
};
```

---

## Parámetros del endpoint

**Ruta:** `POST /api/v1/inventario/sincronizar-excel`

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `archivo` | MultipartFile | Sí | Archivo Excel |
| `nombreHoja` | String | No | Nombre exacto de hoja. Si ausente → hoja activa |
| `idCategoria` | int | Sí | ID de la categoría seleccionada |
| `filaInicio` | int | Sí | Primera fila de datos, 1-based (ej: 2 para saltar header) |
| `filaFin` | int | Sí | Última fila de datos, 1-based, inclusiva |

**Conversión en backend:**
```java
int headerPOI  = filaInicio - 2;   // fila antes del inicio → header para detección
int idxInicio  = filaInicio - 1;   // primer dato (0-based)
int idxFin     = filaFin - 1;      // último dato (0-based)
```

---

## DTO de respuesta del backend

```java
public record SincronizarInventarioExcelResultado(
    List<ResultadoItemInventario> resultados,
    int totalEncontrados,
    int totalNoEncontrados,
    int totalFilasProcesadas,
    String nombreHojaLeida,  // para mostrar en el modal de resultado
    int colNombreDetectada,  // debug/info
    int colStockDetectada    // debug/info
) {
    public record ResultadoItemInventario(
        int fila,
        String nombreExcel,
        Integer idInventario,
        Integer idProducto,
        String nombreProducto,
        BigDecimal stockExcel,
        BigDecimal stockActual,
        String estado           // "ok" | "no_encontrado"
    ) {}
}
```

---

## Tipos TypeScript nuevos

```typescript
// frontend/src/types/inventario.types.ts

export interface IResultadoItemInventarioExcel {
  fila: number;
  nombreExcel: string;
  idInventario?: number;
  idProducto?: number;
  nombreProducto?: string;
  stockExcel?: number;
  stockActual?: number;
  estado: 'ok' | 'no_encontrado';
}

export interface ISincronizarInventarioExcelResultado {
  resultados: IResultadoItemInventarioExcel[];
  totalEncontrados: number;
  totalNoEncontrados: number;
  totalFilasProcesadas: number;
  nombreHojaLeida?: string;
  colNombreDetectada?: number;
  colStockDetectada?: number;
}
```

---

## Servicio frontend

```typescript
// frontend/src/services/inventario-service.ts

export const sincronizarInventarioDesdeExcelService = async (
  archivo: File,
  filaInicio: number,
  filaFin: number,
  idCategoria: number,
  nombreHoja?: string
): Promise<ISincronizarInventarioExcelResultado> => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('filaInicio', String(filaInicio));
  formData.append('filaFin', String(filaFin));
  formData.append('idCategoria', String(idCategoria));
  const params = nombreHoja ? `?nombreHoja=${encodeURIComponent(nombreHoja)}` : '';
  const response = await api.post<ISincronizarInventarioExcelResultado>(
    `/inventario/sincronizar-excel${params}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};
```

---

## Estados del componente (inventario.tsx)

```typescript
import * as XLSX from 'xlsx';  // ya en el proyecto

// Fuera del componente
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

const normalizarParaMatch = (s: string): string =>
  s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const intentarAutoMatchCategoria = (
  nombreHoja: string,
  categorias: { id: number; nombre: string }[]
): number | null => {
  const norm = normalizarParaMatch(nombreHoja);
  return categorias.find(c => normalizarParaMatch(c.nombre) === norm)?.id ?? null;
};

// Dentro del componente InventarioPage:
const excelFileInputRef = React.useRef<HTMLInputElement>(null);
const [excelPendingFile,     setExcelPendingFile]     = React.useState<File | null>(null);
const [excelSheetOptions,    setExcelSheetOptions]    = React.useState<string[]>([]);
const [excelSelectedSheet,   setExcelSelectedSheet]   = React.useState<string | null>(null);
const [excelSelectedCatId,   setExcelSelectedCatId]   = React.useState<number | null>(null);
const [excelFilaInicio,      setExcelFilaInicio]      = React.useState<number>(2);
const [excelFilaFin,         setExcelFilaFin]         = React.useState<number>(500);
const [excelModalVista,      setExcelModalVista]      = React.useState<'hojas' | 'config'>('hojas');
const [isSincronizandoExcel, setIsSincronizandoExcel] = React.useState(false);
const [excelResultado,       setExcelResultado]       = React.useState<ISincronizarInventarioExcelResultado | null>(null);
const [excelEspecierosAviso, setExcelEspecierosAviso] = React.useState(false);

const { isOpen: isSincronizarExcelOpen, onOpen: onSincronizarExcelOpen, onOpenChange: onSincronizarExcelOpenChange } = useDisclosure();
const { isOpen: isExcelResultOpen,      onOpen: onExcelResultOpen,      onOpenChange: onExcelResultOpenChange }      = useDisclosure();
```

---

## Handlers

```typescript
const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  try {
    const hojas = await leerNombresHojas(file);
    setExcelPendingFile(file);
    setExcelSheetOptions(hojas);
    setExcelSelectedSheet(null);
    setExcelSelectedCatId(null);
    setExcelFilaInicio(2);
    setExcelFilaFin(500);
    setExcelEspecierosAviso(false);

    if (hojas.length <= 1) {
      const hoja = hojas[0] ?? '';
      setExcelSelectedSheet(hoja);
      setExcelSelectedCatId(intentarAutoMatchCategoria(hoja, categoriasActivas));
      if (hoja === 'ESPECIEROS') { setExcelFilaInicio(4); setExcelFilaFin(29); setExcelEspecierosAviso(true); }
      setExcelModalVista('config');
    } else {
      setExcelModalVista('hojas');
    }
    onSincronizarExcelOpen();
  } catch {
    toast.error('No se pudo leer el archivo Excel');
  }
};

const handleSeleccionarHojaExcel = (nombreHoja: string) => {
  setExcelSelectedSheet(nombreHoja);
  setExcelSelectedCatId(intentarAutoMatchCategoria(nombreHoja, categoriasActivas));
  if (nombreHoja === 'ESPECIEROS') {
    setExcelFilaInicio(4); setExcelFilaFin(29); setExcelEspecierosAviso(true);
  } else {
    setExcelFilaInicio(2); setExcelFilaFin(500); setExcelEspecierosAviso(false);
  }
  setExcelModalVista('config');
};

const handleDoSincronizarExcel = async () => {
  if (!excelPendingFile || !excelSelectedSheet || excelSelectedCatId === null) return;
  setIsSincronizandoExcel(true);
  try {
    const resultado = await sincronizarInventarioDesdeExcelService(
      excelPendingFile, excelFilaInicio, excelFilaFin, excelSelectedCatId, excelSelectedSheet
    );
    setExcelResultado(resultado);
    onSincronizarExcelOpenChange();
    onExcelResultOpen();
  } catch (err: any) {
    toast.error(err.message || 'Error al procesar el Excel');
  } finally {
    setIsSincronizandoExcel(false);
  }
};

const handleAplicarSincronizacion = async () => {
  if (!excelResultado) return;
  const requests = excelResultado.resultados
    .filter(r => r.estado === 'ok' && r.idInventario != null)
    .map(r => ({
      idInventario: r.idInventario!,
      delta: r.stockExcel ?? 0,
      stockEnVista: r.stockActual ?? 0,
      tipoMovimiento: 'Ajuste'  // confirmar tipo válido en backend
    }));
  try {
    const result = await bulkUpdateInventoryStockService(requests);
    toast.success(`Sincronización completada: ${result.exitosos.length} productos actualizados`);
    onExcelResultOpenChange();
    cargarDatosIniciales();
  } catch (err: any) {
    toast.error(err.message || 'Error al aplicar sincronización');
  }
};
```

---

## Archivos a modificar

### Backend (preparar aparte)
| Archivo | Acción |
|---------|--------|
| `SincronizarInventarioExcelResultado.java` | Crear record |
| `InventarioService.java` | Agregar método con detección dinámica |
| `InventarioController.java` | Agregar endpoint |
| `SpringSecurityConfig.java` | Agregar regla |

### Frontend (esta sesión)
| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/inventario.tsx` | Botón + input oculto + modal 2 vistas + handlers |
| `frontend/src/services/inventario-service.ts` | Agregar `sincronizarInventarioDesdeExcelService` |
| `frontend/src/types/inventario.types.ts` | Agregar 2 interfaces |

---

## Puntos a confirmar

1. **Roles del endpoint:** ¿`PROFESOR_A_CARGO` accede o solo `ADMINISTRADOR`/`CO_ADMINISTRADOR`?
2. **Modo set vs delta para encontrados:** ¿El stock del Excel reemplaza el stock (→ Ajuste a stockExcel) o es un incremento directo?

---

## Parte 2 — Procesamiento backend y modal de resultados

### Lógica de matcheo por fila (backend)

Antes del loop, cargar una vez:
```java
List<UnidadMedida> unidadesActivas = unidadMedidaRepository.findByActivoTrue();
```

**Detección de columna de unidad:** algoritmo dinámico — busca header que contenga `"U/MEDIDA"`, `"UNIDAD"` o `"MEDIDA"`.

Para cada fila válida (nombre y stock no vacíos):
```java
String nombreExcel  = StringUtils.capitalizeFully(getCellText(row.getCell(colNombre)).strip());
String unidadExcel  = StringUtils.capitalizeFully(getCellText(row.getCell(colUnidad)).strip());
BigDecimal stockExcel = parseCantidad(row.getCell(colStock));

// Matcheo de unidad (por nombre o abreviatura)
Optional<UnidadMedida> unidadMatch = unidadesActivas.stream()
    .filter(u -> StringUtils.capitalizeFully(u.getNombre()).equals(unidadExcel)
              || StringUtils.capitalizeFully(u.getAbreviatura()).equals(unidadExcel))
    .findFirst();

// Matcheo de producto (por nombre + categoría)
Optional<Inventario> invMatch = inventarioRepository
    .findByProductoNombreIgnoreCaseAndProductoCategoriaId(nombreExcel, idCategoria);
```

**Si encontrado — actualizar stock:**
```java
// Crear movimiento de ajuste
MovimientoInventario mov = new MovimientoInventario();
mov.setTipoMovimiento("Ajuste");
mov.setDescripcion("sincronizacion excel");
mov.setStockAnterior(inv.getStockActual());
mov.setStockNuevo(stockExcel);
// ... persistir movimiento y actualizar inv.setStockActual(stockExcel)
// estado = "ok"
```

**Si no encontrado — agregar a lista de retorno:**
```java
// estado = "no_encontrado"
// incluir: nombreExcel, unidadMedidaExcel, idUnidadMedida (null si no matcheó), stockExcel
```

---

### DTO actualizado (agregar campos de unidad)

```java
public record ResultadoItemInventario(
    int fila,
    String nombreExcel,
    Integer idInventario,
    Integer idProducto,
    String nombreProducto,
    BigDecimal stockExcel,
    BigDecimal stockActual,
    String unidadMedidaExcel,   // ← nuevo: nombre capitalizado del Excel
    Integer idUnidadMedida,     // ← nuevo: null si no matcheó con unidades activas
    String estado               // "ok" | "no_encontrado"
) {}
```

### Tipo TypeScript actualizado

```typescript
// frontend/src/types/inventario.types.ts
export interface IResultadoItemInventarioExcel {
  fila: number;
  nombreExcel: string;
  idInventario?: number;
  idProducto?: number;
  nombreProducto?: string;
  stockExcel?: number;
  stockActual?: number;
  unidadMedidaExcel?: string;   // ← nuevo
  idUnidadMedida?: number;       // ← nuevo
  estado: 'ok' | 'no_encontrado';
}
```

---

### Modal de resultados (Vista C — frontend)

Se abre automáticamente tras recibir respuesta de `handleDoSincronizarExcel`.

```
┌─────────────────────────────────────────────────────┐
│  Resultado — Sincronización Excel                   │
│                                                     │
│  ✓ 45 productos sincronizados                       │
│                                                     │
│  Productos no encontrados (12)                      │
│  ┌──────────────────────────────────────────┐       │
│  │ ☑ Tomate Cherry      Kg      2.5         │       │
│  │ ☑ Aceite de Oliva    Lt      1.0         │       │
│  │ ☐ Producto Raro      —       0.0         │       │
│  └──────────────────────────────────────────┘       │
│                                                     │
│  [Cerrar]       [Incluir seleccionados (11)]         │
└─────────────────────────────────────────────────────┘
```

Estados adicionales en `InventarioPage`:
```typescript
const [excelNoEncontradosSeleccionados, setExcelNoEncontradosSeleccionados] =
  React.useState<Set<number>>(new Set()); // Set de índices (fila) de los seleccionados
const [isIncluyendoNoEncontrados, setIsIncluyendoNoEncontrados] = React.useState(false);
```

---

### Endpoint de confirmación de nuevos

**Ruta:** `POST /api/v1/inventario/sincronizar-excel/confirmar-nuevos`

**Body (JSON):**
```json
[
  { "nombre": "Tomate Cherry", "idUnidadMedida": 3, "stock": 2.5, "idCategoria": 7 },
  ...
]
```

**Acción por item:**
1. Crear producto nuevo (nombre, idUnidadMedida, idCategoria)
2. Crear entrada de inventario para ese producto
3. Crear movimiento tipo `"Entrada"`, descripcion `"sincronizacion del inventario"`, stockNuevo = stock del Excel

**Diferencia de movimientos:**

| Origen | Tipo movimiento | Descripción |
|--------|----------------|-------------|
| Productos encontrados (sync inmediata) | `"Ajuste"` | `"sincronizacion excel"` |
| Productos nuevos confirmados por usuario | `"Entrada"` | `"sincronizacion del inventario"` |
