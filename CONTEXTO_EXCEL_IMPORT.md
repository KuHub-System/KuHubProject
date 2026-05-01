# Contexto: Importación Excel — Pedido Semanal a Bodega

## Decisión arquitectónica

**Opción elegida: validación por backend**

El usuario sube un archivo `.xlsx` desde el frontend. El frontend lo envía al backend
(multipart/form-data). El backend parsea, valida los productos contra la BD y retorna
un JSON con los resultados. El frontend usa ese JSON para poblar el formulario.

---

## Por qué backend

- Los productos del Excel pueden venir por nombre o código que requiere cruce contra BD
- El backend resuelve el mapeo producto → idProducto, unidad, esFraccionario
- Centraliza la validación (duplicados, existencia, formato de cantidad)
- El frontend solo renderiza lo que el backend aprueba

---

## Página destino

`frontend/src/pages/pedido-semanal-a-bodega.tsx`

Modal: **Nuevo Pedido Semanal** → sección Ingredientes

### Ubicación del botón en el modal

El botón "Importar Excel" va en el **footer del modal**, entre los botones
**Cancelar** y **Crear Pedido Semanal**:

```
[ Cancelar ]   [ Importar Excel ]   [ Crear Pedido Semanal ]
```

El botón debe tener estilo secundario/outline (no primario) para no competir
visualmente con el CTA principal "Crear Pedido Semanal".

El formulario ya tiene:
- `ingredientes[]` state con `{ id, productoId, productoNombre, cantidad, unidadMedida }`
- `agregarIngrediente()` para agregar filas
- `actualizarIngrediente(index, campo, valor)` para poblar campos
- `validarYActualizarCantidad()` para formatear y validar el campo `cant`
- `productos[]` con todos los productos disponibles (ya cargado en memoria)

---

## Flujo esperado

```
Usuario sube .xlsx
→ Frontend lee bytes (FileReader o input[type=file])
→ POST /api/v1/pedido-bodega/importar-excel  (multipart/form-data, campo: "archivo")
→ Backend parsea xlsx, cruza con BD, retorna:

{
  "resultados": [
    {
      "fila": 2,
      "nombreExcel": "Harina",
      "idProducto": 15,
      "nombreProducto": "Harina sin polvos",
      "cantidad": 1234.5,
      "unidadMedida": "kg",
      "estado": "ok"          // "ok" | "no_encontrado" | "cantidad_invalida"
    },
    {
      "fila": 3,
      "nombreExcel": "Azucarr",
      "estado": "no_encontrado",
      "cantidad": 500.0
    }
  ],
  "totalOk": 1,
  "totalErrores": 1
}

→ Frontend muestra resumen (X productos cargados, Y no encontrados)
→ Por cada resultado con estado "ok": llama agregarIngrediente() + actualizarIngrediente()
→ Filas con error se muestran al usuario para corrección manual
```

---

## Formato Excel esperado (columnas)

| Columna A       | Columna B   |
|-----------------|-------------|
| Nombre Producto | Cantidad    |
| Harina          | 1234,5      |
| Aceite          | 500         |

- Fila 1: encabezados (se ignora)
- Fila 2 en adelante: datos
- Cantidad en formato numérico o texto con coma decimal (es-CL)

---

## Campo cantidad — reglas ya implementadas

- Max: `9.999.999,999` (NUMERIC(10,3) en PostgreSQL)
- Separador de miles: punto `.` (automático)
- Separador decimal: coma `,` (escribe el usuario / viene del Excel)
- Se envía al backend como float: `1234567.890`
- Se validan en `validarYActualizarCantidad()` (pedido-semanal-a-bodega.tsx)

---

## Endpoint a crear (backend)

**Archivo sugerido:** `backend/src/main/java/.../controller/PedidoBodegaController.java`
(o donde corresponda según estructura del backend)

```
POST /api/v1/pedido-bodega/importar-excel
Content-Type: multipart/form-data
Body: archivo (MultipartFile)

Response 200: { resultados: [...], totalOk: N, totalErrores: N }
Response 400: error de formato de archivo
```

---

## Librerías Excel disponibles

**Frontend:** `xlsx: 0.18.5` y `xlsx-js-style: 1.2.0` (ya instaladas — no se necesitan)

**Backend (Java/Spring Boot):** usar Apache POI (verificar si ya está en pom.xml)

---

## Estado

- [ ] Endpoint backend `POST /importar-excel`
- [ ] Lógica de parseo y cruce con BD en el backend
- [ ] Botón "Importar Excel" en el modal (pedido-semanal-a-bodega.tsx)
- [ ] Input file + llamada al endpoint
- [ ] Renderizado de resultados y población del formulario
- [ ] Manejo de errores (productos no encontrados)
