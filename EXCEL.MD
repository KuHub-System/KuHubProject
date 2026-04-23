=======
# Formato Excel - Conglomerado de Pedidos

Este documento describe la estructura, estilos y reglas de formato utilizados en los archivos Excel generados por la página **Conglomerado de Pedidos**.

## Librería utilizada

- **xlsx-js-style**: versión 0.18.5
- Permite aplicar estilos avanzados (colores, bordes, alineación, fuentes) a celdas individuales.

## Estructura general

Cada archivo Excel contiene una hoja de cálculo con:

1. **Título fusionado** en la primera fila.
2. **Encabezados de columna** con estilo de cabecera.
3. **Filas de datos** agrupadas por categoría.
4. **Subtotales** por categoría.
5. **Fórmulas** para sumatorias (cuando corresponde).
6. **Ajustes de formato**: anchos de columna, filas congeladas, bordes.

## Paleta de colores oficial

Los colores siguen la paleta del sistema KuHub:

| Uso | Color HEX | RGB | Ejemplo en Excel |                                                                                                                                                                                        
|---|---|---|---|                                                                                                                                                                                                                   
| **Primario (amarillo Duoc)** | `#FFB800` | `255,184,0` | Fondo título |                                                                                                                                                           
| **Secundario (negro Duoc)** | `#1A1A1A` | `26,26,26` | Texto título |                                                                                                                                                             
| **Fondo cabecera** | `#2D3748` | `45,55,72` | Encabezados de tabla |                                                                                                                                                              
| **Fondo categoría** | `#FFF3CD` | `255,243,205` | Fila nombre categoría |                                                                                                                                                         
| **Fondo subtotal** | `#4A5568` | `74,85,104` | Fila subtotal |                                                                                                                                                                    
| **Fondo datos (alterno)** | `#F7FAFC` | `247,250,252` | Filas alternas |                                                                                                                                                          
| **Borde estándar** | `#E2E8F0` | `226,232,240` | Bordes de celdas |                                                                                                                                                               
| **Borde categoría** | `#E2C97E` | `226,201,126` | Bordes fila categoría |                                                                                                                                                         
| **Borde subtotal** | `#718096` | `113,128,150` | Bordes fila subtotal |                                                                                                                                                           
| **Destacado positivo** | `#C6F6D5` | `198,246,213` | Celdas de total |                                                                                                                                                            
| **Texto positivo** | `#276749` | `39,103,73` | Números en total |                                                                                                                                                                 
| **Texto cabecera** | `#FFFFFF` | `255,255,255` | Encabezados |                                                                                                                                                                    

## Estilos predefinidos

Se definen objetos de estilo reutilizables en el código:

### Título
```javascript                                                                                                                                                                                                                       
const styleTitle = {                                                                                                                                                                                                                
  font: { bold: true, sz: 14, color: { rgb: '1A1A1A' } },                                                                                                                                                                           
  fill: { fgColor: { rgb: 'FFB800' } },                                                                                                                                                                                             
  alignment: { horizontal: 'center', vertical: 'center', wrapText: false }                                                                                                                                                          
};                                                                                                                                                                                                                                  
```                                                                                                                                                                                                                                 

### Cabecera de tabla
```javascript                                                                                                                                                                                                                       
const styleHeader = {                                                                                                                                                                                                               
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },                                                                                                                                                                           
  fill: { fgColor: { rgb: '2D3748' } },                                                                                                                                                                                             
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },                                                                                                                                                          
  border: {                                                                                                                                                                                                                         
    top:    { style: 'thin', color: { rgb: 'FFFFFF' } },                                                                                                                                                                            
    bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },                                                                                                                                                                            
    left:   { style: 'thin', color: { rgb: 'FFFFFF' } },                                                                                                                                                                            
    right:  { style: 'thin', color: { rgb: 'FFFFFF' } }                                                                                                                                                                             
  }                                                                                                                                                                                                                                 
};                                                                                                                                                                                                                                  
```                                                                                                                                                                                                                                 

### Fila categoría
```javascript                                                                                                                                                                                                                       
const styleCat = {                                                                                                                                                                                                                  
  font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },                                                                                                                                                                           
  fill: { fgColor: { rgb: 'FFF3CD' } },                                                                                                                                                                                             
  alignment: { horizontal: 'left', vertical: 'center' },                                                                                                                                                                            
  border: {                                                                                                                                                                                                                         
    top:    { style: 'thin', color: { rgb: 'E2C97E' } },                                                                                                                                                                            
    bottom: { style: 'thin', color: { rgb: 'E2C97E' } },                                                                                                                                                                            
    left:   { style: 'thin', color: { rgb: 'E2C97E' } },                                                                                                                                                                            
    right:  { style: 'thin', color: { rgb: 'E2C97E' } }                                                                                                                                                                             
  }                                                                                                                                                                                                                                 
};                                                                                                                                                                                                                                  
```                                                                                                                                                                                                                                 

### Celda numérica estándar
```javascript                                                                                                                                                                                                                       
const styleNum = {                                                                                                                                                                                                                  
  font: { sz: 10 },                                                                                                                                                                                                                 
  fill: { fgColor: { rgb: 'FFFFFF' } },                                                                                                                                                                                             
  alignment: { horizontal: 'right', vertical: 'center' },                                                                                                                                                                           
  border: {                                                                                                                                                                                                                         
    top:    { style: 'thin', color: { rgb: 'E2E8F0' } },                                                                                                                                                                            
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },                                                                                                                                                                            
    left:   { style: 'thin', color: { rgb: 'E2E8F0' } },                                                                                                                                                                            
    right:  { style: 'thin', color: { rgb: 'E2E8F0' } }                                                                                                                                                                             
  }                                                                                                                                                                                                                                 
};                                                                                                                                                                                                                                  
```                                                                                                                                                                                                                                 

### Subtotales
```javascript                                                                                                                                                                                                                       
const styleTotal = {                                                                                                                                                                                                                
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },                                                                                                                                                                           
  fill: { fgColor: { rgb: '4A5568' } },                                                                                                                                                                                             
  alignment: { horizontal: 'center', vertical: 'center' },                                                                                                                                                                          
  border: {                                                                                                                                                                                                                         
    top:    { style: 'thin', color: { rgb: '718096' } },                                                                                                                                                                            
    bottom: { style: 'thin', color: { rgb: '718096' } },                                                                                                                                                                            
    left:   { style: 'thin', color: { rgb: '718096' } },                                                                                                                                                                            
    right:  { style: 'thin', color: { rgb: '718096' } }                                                                                                                                                                             
  }                                                                                                                                                                                                                                 
};                                                                                                                                                                                                                                  
```                                                                                                                                                                                                                                 

## Formato de números

Los números se formatean con **locale chileno (es-CL)**:
- Separador de miles: **punto** (`.`)
- Separador decimal: **coma** (`,`)
- Máximo 3 decimales

```javascript                                                                                                                                                                                                                       
const fmtN = (v: number): string =>                                                                                                                                                                                                 
  v.toLocaleString('es-CL', { maximumFractionDigits: 3 });                                                                                                                                                                          
```                                                                                                                                                                                                                                 

Ejemplos:
- `1234.5` → `"1.234,5"`
- `1500` → `"1.500"`
- `89.1234` → `"89,123"`

## Funciones auxiliares

### Conversión índice a letra de columna
Convierte índice 0‑based a letra(s) Excel (0→A, 25→Z, 26→AA…)

```javascript                                                                                                                                                                                                                       
const cl = (c: number): string => {                                                                                                                                                                                                 
  let s = ''; let n = c + 1;                                                                                                                                                                                                        
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }                                                                                                                                        
  return s;                                                                                                                                                                                                                         
};                                                                                                                                                                                                                                  
```                                                                                                                                                                                                                                 

### Creación de celda con estilo
```javascript                                                                                                                                                                                                                       
const sc = (v: string | number | null, s: object) => ({                                                                                                                                                                             
  v: typeof v === 'number' ? fmtN(v) : (v ?? ''),                                                                                                                                                                                   
  t: 's',  // tipo string                                                                                                                                                                                                           
  s,                                                                                                                                                                                                                                
});                                                                                                                                                                                                                                 
```                                                                                                                                                                                                                                 

### Celda con fórmula
```javascript                                                                                                                                                                                                                       
const sf = (_formula: string, v: number, s: object) => ({                                                                                                                                                                           
  v: fmtN(v),  // valor precalculado como texto (fórmulas SUM no operan sobre celdas texto)                                                                                                                                         
  t: 's',                                                                                                                                                                                                                           
  s,                                                                                                                                                                                                                                
});                                                                                                                                                                                                                                 
```                                                                                                                                                                                                                                 

## Configuración de la hoja

### Anchura automática de columnas
```javascript                                                                                                                                                                                                                       
const autoColWidth = (data: (string | number | null)[][], startRow: number) =>                                                                                                                                                      
  data[startRow]?.map((_, ci) => ({                                                                                                                                                                                                 
    wch: Math.min(40, Math.max(8, ...data.map(row => String(row[ci] ?? '').length + 2)))                                                                                                                                            
  })) ?? [];                                                                                                                                                                                                                        
```                                                                                                                                                                                                                                 

### Filas congeladas (paneles fijos)
```javascript                                                                                                                                                                                                                       
ws['!freeze'] = { xSplit: 3, ySplit: 3 }; // congela 3 columnas y 3 filas                                                                                                                                                           
```                                                                                                                                                                                                                                 

### Altura de fila personalizada
```javascript                                                                                                                                                                                                                       
ws['!rows'] = [{ hpt: 28 }, {}, { hpt: 22 }]; // altura en puntos                                                                                                                                                                   
```                                                                                                                                                                                                                                 

### Fusiones de celdas
```javascript                                                                                                                                                                                                                       
const merges = [];                                                                                                                                                                                                                  
merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } }); // fusiona primera fila                                                                                                                                              
ws['!merges'] = merges;                                                                                                                                                                                                             
```                                                                                                                                                                                                                                 

## Estructura por tipo de vista

### 1. Vista por día (descargarExcelDia)
- **Columnas**: Categoría | Producto | Unidad | [Secciones] | Total Día
- **Agrupación**: Por categoría → productos → secciones
- **Subtotales**: Por categoría (suma por sección y total)
- **Fórmulas**: `SUM()` en columna Total Día

### 2. Vista completa (descargarExcelCompleta)
- **Columnas**: Categoría | Producto | Sección | Unidad | Lunes…Domingo | Total Semana
- **Agrupación**: Por categoría → producto → sección → días
- **Subtotales**: Por categoría y por producto (cuando hay múltiples secciones)
- **Fórmulas**: `SUM()` en totales por día y total semana

## Nombres de archivo

- **Vista por día**: `categorias_[nombre_dia]_[nombre_semana].xlsx`
- **Vista completa**: `categorias_completo_[nombre_semana].xlsx`

Ejemplo: `categorias_lunes_semana_12_2025.xlsx`

## Consideraciones técnicas

1. **Fórmulas vs valores precalculados**: Debido a limitaciones de `xlsx-js-style` con fórmulas sobre celdas de texto, los totales se insertan como valores precalculados en lugar de fórmulas `SUM()` reales.

2. **Rendimiento**: Para conjuntos grandes de datos (>1000 filas), se recomienda:
    - Limitar la cantidad de columnas dinámicas (secciones)
    - Usar valores precalculados en lugar de fórmulas complejas

3. **Compatibilidad**: El formato generado es compatible con:
    - Microsoft Excel 2010+
    - Google Sheets (al importar)
    - LibreOffice Calc 7.0+

4. **Codificación**: Todos los textos usan codificación UTF-8.

## Ejemplo de flujo de generación

```javascript                                                                                                                                                                                                                       
// 1. Preparar datos                                                                                                                                                                                                                
const rawRows = [...];                                                                                                                                                                                                              
                                                                                                                                                                                                                                    
// 2. Crear worksheet                                                                                                                                                                                                               
const ws: Record<string, any> = {};                                                                                                                                                                                                 
                                                                                                                                                                                                                                    
// 3. Aplicar estilos celda por celda                                                                                                                                                                                               
ws[XLSXStyle.utils.encode_cell({ r: 0, c: 0 })] = sc('Título', styleTitle);                                                                                                                                                         
                                                                                                                                                                                                                                    
// 4. Configurar propiedades de hoja                                                                                                                                                                                                
ws['!ref'] = XLSXStyle.utils.encode_range(...);                                                                                                                                                                                     
ws['!merges'] = merges;                                                                                                                                                                                                             
ws['!cols'] = autoColWidth(...);                                                                                                                                                                                                    
ws['!freeze'] = { xSplit: 3, ySplit: 3 };                                                                                                                                                                                           
                                                                                                                                                                                                                                    
// 5. Crear libro y guardar                                                                                                                                                                                                         
const wb = XLSXStyle.utils.book_new();                                                                                                                                                                                              
XLSXStyle.utils.book_append_sheet(wb, ws, 'Hoja1');                                                                                                                                                                                 
XLSXStyle.writeFile(wb, 'archivo.xlsx');                                                                                                                                                                                            
```                                                                                                                                                                                                                                 

## Referencias

- [xlsx-js-style documentation](https://github.com/gitbrent/xlsx-js-style)
- [Excel JavaScript API - Number Format](https://docs.microsoft.com/en-us/javascript/api/excel/excel.numberformat)
- [Paleta de colores KuHub](../src/index.css)