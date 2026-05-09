# Implementaciones Específicas — ejecutar_ahora.md

---

## 1. Modificación: Vista por Categoría — Agrupamiento por Asignaturas

**Objetivo:** Cambiar el agrupamiento y leyendas de la vista por categoría de "secciones de muchas asignaturas" a solo "asignaturas".

**Estado actual:** Los colores se asignan y agrupan por composite key `"nombreAsignatura::nombreSeccion"`, mostrando en la leyenda "§Sección · Asignatura".

**Cambios necesarios:**

### 1.1 Creación del Map de Asignaturas (línea 288-296)

**Archivo:** `frontend/src/pages/conglomerado-pedidos.tsx`

**Línea actual (288-296):**
```typescript
// clave: "nombreAsignatura::nombreSeccion" → color único por asignatura+sección
const seccionColorMap = React.useMemo(() => {
  const keys = new Set<string>();
  for (const p of productosParaCategorias) {
    for (const d of p.detalles) keys.add(`${d.nombreAsignatura}::${d.nombreSeccion}`);
  }
  const map = new Map<string, string>();
  // ... resto de lógica
```

**Cambiar a:**
- Cambiar nombre de `seccionColorMap` a `asignaturaColorMap` (refactoring completo)
- Cambiar clave de `"asignatura::seccion"` a solo `"asignatura"`
- Actualizar comentario: "clave: nombreAsignatura → color único por asignatura"

---

### 1.2 Aplicación de Colores en Vista Completa (línea 984-993)

**Línea actual (984-986):**
```typescript
const bgColor = conColores && cell.secciones.length === 1
  ? seccionColorMap.get(cell.secciones[0].compositeKey) ?? 'transparent'
  : 'transparent';
```

**Cambiar a:**
- Extraer `nombreAsignatura` de `cell.secciones[0]`
- Usar `asignaturaColorMap.get(nombreAsignatura)` en lugar de composite key

**Línea actual (990-996):**
```typescript
{conColores && cell.secciones.length > 1
  ? cell.secciones.map((sec, si) => (
      <span key={si} className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
        style={{ backgroundColor: seccionColorMap.get(sec.compositeKey) ?? '#f4f4f5' }}>
        {fmtCant(sec.cantidad)}
        <span className="text-[9px] text-default-500 ml-0.5">{row.abreviatura}</span>
      </span>
    ))
```

**Cambiar a:**
- Agrupar por `nombreAsignatura` en lugar de usar `compositeKey`
- Usar `asignaturaColorMap.get(nombreAsignatura)`

---

### 1.3 Leyenda Vista Completa (línea 1024-1047)

**Línea actual (1029):**
```typescript
<p className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Leyenda de secciones</p>
```

**Cambiar a:**
```typescript
<p className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Leyenda de asignaturas</p>
```

**Línea actual (1030):**
```typescript
<span className="ml-auto text-[10px] text-default-400">{seccionColorMap.size} sección{seccionColorMap.size !== 1 ? 'es' : ''}</span>
```

**Cambiar a:**
```typescript
<span className="ml-auto text-[10px] text-default-400">{asignaturaColorMap.size} asignatura{asignaturaColorMap.size !== 1 ? 's' : ''}</span>
```

**Línea actual (1033-1041):**
```typescript
{Array.from(seccionColorMap.entries()).map(([key, color]) => {
  const [asignatura, seccion] = key.split('::');
  return (
    <div key={key}
      className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-lg border border-default-200 text-default-700"
      style={{ backgroundColor: color }}>
      <span className="font-mono font-bold text-xs">§{seccion}</span>
      <span className="text-default-400 text-[10px]">·</span>
      <span className="text-[11px] font-medium truncate max-w-[120px]" title={asignatura}>{asignatura}</span>
    </div>
  );
})}
```

**Cambiar a:**
```typescript
{Array.from(asignaturaColorMap.entries()).map(([nombreAsignatura, color]) => (
  <div key={nombreAsignatura}
    className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-lg border border-default-200 text-default-700"
    style={{ backgroundColor: color }}>
    <span className="text-[11px] font-medium truncate max-w-[200px]" title={nombreAsignatura}>{nombreAsignatura}</span>
  </div>
))}
```

---

### 1.4 Aplicación de Colores en Vista por Día (línea 1103)

**Línea actual (1103):**
```typescript
style={{ backgroundColor: conColores ? (seccionColorMap.get(key) ?? '#f4f4f5') : 'white' }}>
```

**Cambiar a:**
- Extraer `nombreAsignatura` de la clave
- Usar `asignaturaColorMap.get(nombreAsignatura)`

---

### 1.5 Leyenda Vista por Día (línea 1123-1143)

**Línea actual (1127):**
```typescript
<p className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Leyenda de secciones</p>
```

**Cambiar a:**
```typescript
<p className="text-[10px] font-bold text-default-500 uppercase tracking-wider">Leyenda de asignaturas</p>
```

**Línea actual (1128):**
```typescript
<span className="ml-auto text-[10px] text-default-400">{seccionColorMap.size} sección{seccionColorMap.size !== 1 ? 'es' : ''}</span>
```

**Cambiar a:**
```typescript
<span className="ml-auto text-[10px] text-default-400">{asignaturaColorMap.size} asignatura{asignaturaColorMap.size !== 1 ? 's' : ''}</span>
```

**Línea actual (1131-1141):**
```typescript
{Array.from(seccionColorMap.entries()).map(([key, color]) => {
  const [asignatura, seccion] = key.split('::');
  return (
    <div key={key}
      className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-lg border border-default-200 text-default-700"
      style={{ backgroundColor: color }}>
      <span className="font-mono font-bold text-xs">§{seccion}</span>
      <span className="text-default-400 text-[10px]">·</span>
      <span className="text-[11px] font-medium truncate max-w-[120px]" title={asignatura}>{asignatura}</span>
    </div>
  );
})}
```

**Cambiar a:**
```typescript
{Array.from(asignaturaColorMap.entries()).map(([nombreAsignatura, color]) => (
  <div key={nombreAsignatura}
    className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-lg border border-default-200 text-default-700"
    style={{ backgroundColor: color }}>
    <span className="text-[11px] font-medium truncate max-w-[200px]" title={nombreAsignatura}>{nombreAsignatura}</span>
  </div>
))}
```

---

## Resumen de cambios:

| Aspecto | Líneas | Cambio |
|---|---|---|
| Creación del Map | 288-296 | Cambiar clave de `asignatura::seccion` a solo `asignatura` |
| Vista completa - colores | 984-1004 | Agrupar por asignatura única |
| Leyenda vista completa | 1024-1047 | Cambiar "Leyenda de secciones" a "Leyenda de asignaturas" |
| Leyenda vista completa - items | 1033-1044 | Remover "§Sección ·" y mostrar solo nombre asignatura |
| Vista por día - colores | 1103 | Usar key solo con asignatura |
| Leyenda vista por día | 1123-1143 | Idem vista completa |

---

**Verificación post-cambio:**
- [ ] Los colores se aplican por asignatura (no por sección)
- [ ] La leyenda muestra solo asignaturas
- [ ] No aparecen duplicados en la leyenda para la misma asignatura con diferentes secciones
- [ ] Las tablas mantienen los colores correctamente
- [ ] No hay errores de tipado en TypeScript

---

## 2. Modificación: Descarga de Excel — Agrupamiento por Asignatura y Remover SUBTOTAL

**Objetivo:** Modificar la descarga de Excel para que:
1. Los datos se agrupen por asignatura (no por sección)
2. Remover las filas de SUBTOTAL del Excel

**Estado actual:** El Excel agrupa columnas por `"asignatura::seccion"` y muestra filas de SUBTOTAL después de cada categoría.

**Funciones involucradas:**
- `descargarExcelDia()` - Descarga Excel para un día específico
- `descargarExcelCompleta()` - Descarga Excel para toda la semana

---

### 2.1 Función descargarExcelDia() (línea 467-586)

**Cambios necesarios:**

#### Línea 471-509: Construcción de columnas de secciones

**Línea actual (471-472):**
```typescript
// Clave compuesta "asignatura::seccion" → columna única por asignatura+sección
const todasSecciones = new Set<string>();
```

**Cambiar a:**
```typescript
// Clave: solo "asignatura" → columna única por asignatura
const todasAsignaturas = new Set<string>();
```

**Línea actual (474-477):**
```typescript
for (const cat of categoriasPorDia) {
  for (const prod of cat.productos) {
    for (const det of prod.detallesFiltrados) {
      todasSecciones.add(`${det.nombreAsignatura}::${det.nombreSeccion}`);
```

**Cambiar a:**
```typescript
for (const cat of categoriasPorDia) {
  for (const prod of cat.productos) {
    for (const det of prod.detallesFiltrados) {
      todasAsignaturas.add(det.nombreAsignatura);
```

**Línea actual (479):**
```typescript
const secciones = Array.from(todasSecciones).sort();
```

**Cambiar a:**
```typescript
const asignaturas = Array.from(todasAsignaturas).sort();
```

**Línea actual (482-483):**
```typescript
const buildSecMap = (dets: any[]) => {
  const m = new Map<string, number>();
```

**Cambiar a:**
```typescript
const buildAsignaturaMap = (dets: any[]) => {
  const m = new Map<string, number>();
```

**Línea actual (485-486):**
```typescript
for (const d of dets) {
  const key = `${d.nombreAsignatura}::${d.nombreSeccion}`;
```

**Cambiar a:**
```typescript
for (const d of dets) {
  const key = d.nombreAsignatura;
```

**Línea actual (505):**
```typescript
const nCols = 2 + secciones.length + 1;
```

**Cambiar a:**
```typescript
const nCols = 2 + asignaturas.length + 1;
```

#### Línea 520: Encabezados

**Línea actual (520):**
```typescript
const headers = ['Categoría', 'Producto', 'Unidad', ...secciones.map(secLabel), 'Total Día'];
```

**Cambiar a:**
```typescript
const headers = ['Categoría', 'Producto', 'Unidad', ...asignaturas, 'Total Día'];
```

**Nota:** Remover la función `secLabel` si solo se usa para esto.

#### Línea 541: Mapeo de secciones en filas de productos

**Línea actual (541):**
```typescript
secciones.forEach((k, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 + i })] = sc(sm.get(k) ?? 0, sn); });
```

**Cambiar `secciones` por `asignaturas`:**
```typescript
asignaturas.forEach((a, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 + i })] = sc(buildAsignaturaMap(prod.detallesFiltrados).get(a) ?? 0, sn); });
```

#### Línea 543: Fórmula SUM para total del producto

**Línea actual (543):**
```typescript
`SUM(${cl(3)}${R + 1}:${cl(2 + secciones.length)}${R + 1})`,
```

**Cambiar:**
```typescript
`SUM(${cl(3)}${R + 1}:${cl(2 + asignaturas.length)}${R + 1})`,
```

#### Línea 552-570: **REMOVER SUBTOTAL DE CATEGORÍA COMPLETO**

**Línea actual (552-570):**
```typescript
      // Subtotal categoría — con subtotales por columna de sección
      const totalCat = cat.productos.reduce((s, p) => s + p.totalDia, 0);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(`SUBTOTAL ${cat.nombreCategoria}`, styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc('', styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc('', styleTotal);
      secciones.forEach((k, i) => {
        const secTotal = cat.productos.reduce((sum, p) => sum + (buildSecMap(p.detallesFiltrados).get(k) ?? 0), 0);
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 + i })] = sf(
          `SUM(${cl(3 + i)}${firstProdRDia + 1}:${cl(3 + i)}${lastProdRDia + 1})`,
          secTotal,
          styleTotalN
        );
      });
      ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(
        `SUM(${cl(nCols - 1)}${firstProdRDia + 1}:${cl(nCols - 1)}${lastProdRDia + 1})`,
        totalCat,
        styleTotalN
      );
      R++;
```

**Remover completamente** (líneas 552-570). Esto elimina toda la fila de SUBTOTAL.

#### Línea 557: Cambiar `secciones` a `asignaturas`

**Línea actual (557):**
```typescript
secciones.forEach((k, i) => {
```

**Si no se removió el subtotal, cambiar a:**
```typescript
asignaturas.forEach((a, i) => {
  const asigTotal = cat.productos.reduce((sum, p) => sum + (buildAsignaturaMap(p.detallesFiltrados).get(a) ?? 0), 0);
```

---

### 2.2 Función descargarExcelCompleta() (línea 589-713)

**Cambios necesarios:**

#### Línea 593-630: Construcción de columnas de secciones

**Línea actual (593):**
```typescript
// Cols: Categoría | Producto | Sección | Unidad | Lun…Dom | Total Semana
```

**Cambiar a:**
```typescript
// Cols: Categoría | Producto | Unidad | Lun…Dom | Total Semana (sin columna Sección/Asignatura)
```

**Línea actual (594-615):**
```typescript
const nCols = 4 + diasNombres.length + 1;
// ... construcción de prodSecMap con "asignatura::seccion" ...
```

**Cambiar completamente la lógica de construcción para usar solo asignatura:**

En lugar de crear filas por sección, crear filas por asignatura agregando cantidades.

#### Línea 644: Encabezados

**Línea actual (644):**
```typescript
const headers = ['Categoría', 'Producto', 'Sección', 'Unidad', ...diasNombres, 'Total Semana'];
```

**Cambiar a:**
```typescript
const headers = ['Categoría', 'Producto', 'Unidad', ...diasNombres, 'Total Semana'];
```

**Y actualizar nCols:**
```typescript
const nCols = 3 + diasNombres.length + 1;  // Sin la columna "Sección"
```

#### Línea 657-679: **Estructura de filas de secciones/asignaturas**

**Línea actual (657-679):**
```typescript
        const secciones = Array.from(prodSecMap.get(row.idProducto)?.entries() ?? []).sort(([a], [b]) => a.localeCompare(b));
        const hasManySecs = secciones.length > 1;

        for (const [, sec] of secciones) {
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombre, styleSecRow);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc(row.nombreProducto, styleSecRow);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc(sec.label, styleSecRow);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 })] = sc(row.abreviatura, { ...styleSecNum, alignment: { horizontal: 'center', vertical: 'center' } });
          diasOrden.forEach((dia, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 4 + i })] = sc(sec.days[dia] ?? 0, styleSecNum); });
          ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(`SUM(${cl(4)}${R+1}:${cl(4+diasOrden.length-1)}${R+1})`, sec.total, styleNumHL);
          R++;
        }
```

**Cambiar a (una sola fila por producto, sin detallar por asignatura):**
```typescript
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombre, styleSecRow);
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc(row.nombreProducto, styleSecRow);
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc(row.abreviatura, { ...styleSecNum, alignment: { horizontal: 'center', vertical: 'center' } });
        diasOrden.forEach((dia, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 + i })] = sc(row.diasData[dia]?.total ?? 0, styleSecNum); });
        ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(`SUM(${cl(3)}${R+1}:${cl(3+diasOrden.length-1)}${R+1})`, row.totalSemana, styleNumHL);
        R++;
```

#### Línea 670-679: **REMOVER Subtotal del producto**

**Línea actual (670-679):**
```typescript
        if (hasManySecs) {
          // Subtotal del producto
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(cat.nombre, styleProdTotalLabel);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc(row.nombreProducto, styleProdTotalLabel);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc('TOTAL PRODUCTO', styleProdTotalLabel);
          ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 })] = sc(row.abreviatura, { ...styleProdTotal, alignment: { horizontal: 'center', vertical: 'center' } });
          diasOrden.forEach((dia, i) => { ws[XLSXStyle.utils.encode_cell({ r: R, c: 4 + i })] = sc(row.diasData[dia]?.total ?? 0, styleProdTotal); });
          ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(`SUM(${cl(4)}${R+1}:${cl(4+diasOrden.length-1)}${R+1})`, row.totalSemana, styleNumHL);
          R++;
        }
```

**Remover completamente** (ya que no habrá múltiples filas por producto).

#### Línea 683-698: **REMOVER Subtotal de categoría**

**Línea actual (683-698):**
```typescript
      // Subtotal categoría
      const totalesDia = diasOrden.map(dia => cat.filas.reduce((s, r) => s + (r.diasData[dia]?.total ?? 0), 0));
      const totalCat = cat.filas.reduce((s, r) => s + r.totalSemana, 0);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 0 })] = sc(`SUBTOTAL ${cat.nombre}`, styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 1 })] = sc('', styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 2 })] = sc('', styleTotal);
      ws[XLSXStyle.utils.encode_cell({ r: R, c: 3 })] = sc('', styleTotal);
      totalesDia.forEach((t, i) => {
        ws[XLSXStyle.utils.encode_cell({ r: R, c: 4 + i })] = sf(
          `SUM(${cl(4+i)}${firstCatR+1}:${cl(4+i)}${lastCatR+1})`, t || 0, styleTotalN
        );
      });
      ws[XLSXStyle.utils.encode_cell({ r: R, c: nCols - 1 })] = sf(
        `SUM(${cl(nCols-1)}${firstCatR+1}:${cl(nCols-1)}${lastCatR+1})`, totalCat, styleTotalN
      );
      R++;
```

**Remover completamente** (líneas 683-698).

---

## Resumen de cambios en Excel:

| Aspecto | Función | Líneas | Cambio |
|---|---|---|---|
| Columnas | descargarExcelDia | 471-479 | Cambiar de `secciones` a `asignaturas` |
| Encabezados | descargarExcelDia | 520 | Remover "Sección", mostrar solo asignaturas |
| Mapeo datos | descargarExcelDia | 541 | Usar map de asignaturas |
| Fórmula SUM | descargarExcelDia | 543 | Actualizar col range |
| **SUBTOTAL Día** | descargarExcelDia | 552-570 | **REMOVER COMPLETAMENTE** |
| Columnas | descargarExcelCompleta | 593-630 | Cambiar de `secciones` a asignaturas |
| Encabezados | descargarExcelCompleta | 644 | Remover columna "Sección" |
| Estructura filas | descargarExcelCompleta | 657-679 | Una fila por producto (no por sección) |
| **SUBTOTAL Producto** | descargarExcelCompleta | 670-679 | **REMOVER COMPLETAMENTE** |
| **SUBTOTAL Categoría** | descargarExcelCompleta | 683-698 | **REMOVER COMPLETAMENTE** |

---

**Verificación post-cambio:**
- [ ] Las columnas del Excel muestran solo asignaturas
- [ ] No hay columna "Sección" en los encabezados
- [ ] Se removieron todas las filas de SUBTOTAL
- [ ] Los totales de productos/días se calculan correctamente sin subtotales
- [ ] El Excel tiene menos filas que antes
- [ ] Los números en cada asignatura corresponden a la suma de todas sus secciones
- [ ] No hay errores en las fórmulas SUM
