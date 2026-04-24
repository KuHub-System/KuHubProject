# Implementación de Validación de Precios en Formato Chileno

**Fecha:** 2026-04-24  
**Módulo:** Gestión de Proveedores  
**Componentes afectados:** Backend (Java) + Frontend (TypeScript/React)

---

## 1. Objetivo

Estandarizar la entrada, validación y procesamiento de precios en formato chileno (punto como separador de miles, coma como separador decimal):
- **Formato esperado:** `1.234,567` (mil doscientos treinta y cuatro coma cinco seis siete)
- **Variantes válidas:** `1.234` | `1234,567` | `1234.567` | `1234`

---

## 2. Implementación Backend

### 2.1 Utilidad de Parseo: `ChileanPriceUtils`

**Ubicación:** `backend/src/main/java/KuHub/utils/ChileanPriceUtils.java`

Clase estática con métodos para parsear y validar precios en formato chileno:

```java
public class ChileanPriceUtils {
    /**
     * Parsea un precio en formato chileno y retorna BigDecimal.
     */
    public static BigDecimal parseChileanPrice(String input);

    /**
     * Valida si un string es un precio en formato válido.
     */
    public static boolean isValidChileanPrice(String input);
}
```

**Lógica de parseo:**
1. Si tiene coma y puntos (`1.234,567`) → punto = miles, coma = decimal
2. Si solo tiene coma (`1234,567`) → coma = decimal
3. Si solo tiene puntos (`1.234`) → punto = miles (3 dígitos) o decimal (1-2 dígitos)
4. Sin separadores → número entero

**Excepciones:** Lanza `IllegalArgumentException` con mensajes descriptivos si el formato es inválido.

### 2.2 Validador Personalizado: `@ValidChileanPrice`

**Ubicación:** 
- Anotación: `backend/src/main/java/KuHub/modules/gestion_proveedor/dtos/validators/ValidChileanPrice.java`
- Implementación: `backend/src/main/java/KuHub/modules/gestion_proveedor/dtos/validators/ChileanPriceValidator.java`

Se usa en los DTOs para validación automática durante la deserialización:

```java
@ValidChileanPrice(message = "Formato de precio inválido. Use: 1.234,567 | 1.234 | 1234,567 | 1234")
private String precioProducto;
```

### 2.3 DTOs Actualizados

Ambos DTOs ahora aceptan `String` en lugar de `BigDecimal`:

#### `ProveedorProductoUpdateDTO`
```java
@NotNull(message = "El precio es obligatorio")
@NotBlank(message = "El precio no puede estar en blanco")
@ValidChileanPrice(message = "...")
private String precioProducto;
```

#### `ProveedorProductoAddDTO`
```java
@NotNull(message = "El precio del producto es obligatorio")
@NotBlank(message = "El precio no puede estar en blanco")
@ValidChileanPrice(message = "...")
private String precioProducto;
```

### 2.4 Service: Parseo en `actualizarPrecio()` y `agregarProducto()`

**Ubicación:** `backend/src/main/java/KuHub/modules/gestion_proveedor/service/ProveedorServiceImpl.java`

Ambos métodos siguen el mismo patrón:

```java
// 1. Parsear string de chileno a BigDecimal
BigDecimal nuevoPrecio = ChileanPriceUtils.parseChileanPrice(dto.getPrecioProducto());

// 2. Validar que sea mayor a 0
if (nuevoPrecio.compareTo(BigDecimal.ZERO) <= 0) {
    throw new GestionProveedorException("El precio debe ser mayor a 0...", BAD_REQUEST);
}

// 3. Actualizar en BD
relacion.setPrecioProducto(nuevoPrecio);
```

**Logging:** Se registra tanto el input original como el BigDecimal parseado para debugging.

---

## 3. Implementación Frontend

### 3.1 Función de Parseo: `parseChileanPrice()`

**Ubicación:** `frontend/src/pages/gestion-proveedores.tsx` (línea 90)

```typescript
const parseChileanPrice = (input: string): number => {
  // Soporta múltiples formatos
  // Retorna NaN si es inválido (validation occurs before sending)
};
```

**Usado para:** Validación cliente antes de enviar al backend.

### 3.2 Función de Formato: `formatChileanPrice()`

**Ubicación:** `frontend/src/pages/gestion-proveedores.tsx` (línea 130)

```typescript
const formatChileanPrice = (num: number): string => {
  // Formatea 1234.567 → "1.234,567"
  // Preserva hasta 2 decimales
  // Devuelve "0" si NaN
};
```

**Usado para:**
- Mostrar precios en el input de edición inline
- Formatear precio antes de enviar al backend

### 3.3 Flujo de Edición de Precio

```
Usuario edita precio (tabla de productos)
    ↓
handleIniciarEditPrecio()
  - recibe: precioActual (número del backend)
  - formatChileanPrice(precioActual) → "1.234,567"
  - muestra input con valor formateado
    ↓
Usuario escribe en el input (ej: "1.234,567" o "1234,567")
    ↓
handleGuardarPrecio()
  - parseChileanPrice(precioTemp) → validación cliente (número)
  - si es inválido: mostrar error, cancelar
  - si es válido: enviar precioTemp (string formateado) al backend
    ↓
Backend:
  - ChileanPriceUtils.parseChileanPrice(precioTemp) → BigDecimal
  - validación backend (formato + mayor a 0)
  - guardar en BD como BigDecimal
```

### 3.4 Tipos TypeScript Actualizados

**Ubicación:** `frontend/src/types/proveedor.types.ts`

```typescript
export interface IProveedorProductoAddDTO {
  idProducto: number;
  precioProducto: string;  // ← Ahora es string
}

export interface IProveedorProductoUpdateDTO {
  precioProducto: string;  // ← Ahora es string
}
```

---

## 4. Flujo de Datos Completo

### 4.1 Crear Proveedor con Producto

```
Frontend: Input precio → formatChileanPrice() → "1.234,567"
    ↓
API POST /api/v1/proveedor/{id}/productos
  Body: { idProducto: 5, precioProducto: "1.234,567" }
    ↓
Backend: ProveedorProductoAddDTO
  - @NotBlank validation
  - @ValidChileanPrice validation
  - if invalid: return 400 BAD_REQUEST
    ↓
Service.agregarProducto():
  - ChileanPriceUtils.parseChileanPrice("1.234,567")
  - Validación: precio > 0
  - save(ProveedorProducto(precioProducto: BigDecimal(1234.567)))
    ↓
Response: 201 CREATED
```

### 4.2 Actualizar Precio Existente

```
Frontend: Usuario edita, parsea localmente, envía string formateado
    ↓
API PATCH /api/v1/proveedor/{id}/productos/{pid}
  Body: { precioProducto: "1.234,567" }
    ↓
Backend: ProveedorProductoUpdateDTO → validación
    ↓
Service.actualizarPrecio():
  - parseChileanPrice() → BigDecimal
  - Validación adicional
  - update ProveedorProducto
    ↓
Response: 200 OK
```

---

## 5. Manejo de Errores

### Backend - Validación DTO (400 BAD_REQUEST)

Si el formato no es válido:
```json
{
  "message": "El precio 'abc' tiene un formato inválido. Formatos válidos: 1.234,567 | 1.234 | 1234,567 | 1234"
}
```

### Backend - Validación de Valor (400 BAD_REQUEST)

Si el precio es ≤ 0:
```json
{
  "message": "El precio debe ser mayor a 0. Valor ingresado: 0"
}
```

### Frontend - Validación Cliente

Mensaje toast al usuario:
```
"El precio debe ser un número válido mayor a 0 (ej: 1.234,567 o 1234)"
```

---

## 6. Casos de Prueba

### Test 1: Formato Chileno Completo
```
Input: "1.234,567"
parseChileanPrice() → 1234.567
ChileanPriceUtils.parseChileanPrice() → BigDecimal 1234.567
Resultado: ✅ Guardado
```

### Test 2: Sin Separadores de Miles
```
Input: "1234,567"
Resultado: ✅ Guardado como 1234.567
```

### Test 3: Entero con Miles
```
Input: "5.000"
Resultado: ✅ Guardado como 5000
```

### Test 4: Formato Americano
```
Input: "1234.567"
Resultado: ✅ Guardado (asume decimal americano)
```

### Test 5: Número Simple
```
Input: "500"
Resultado: ✅ Guardado como 500
```

### Test 6: Precio Inválido (≤ 0)
```
Input: "0" o "-100"
Resultado: ❌ Error "El precio debe ser mayor a 0"
```

### Test 7: Formato Inválido
```
Input: "1,234.567" (coma después de punto — ambiguo)
Resultado: ❌ Error "Formato inválido"
```

### Test 8: Caracteres Inválidos
```
Input: "abc1.234,567" o "1.234,56x7"
Resultado: ❌ Error "Formato inválido"
```

---

## 7. Archivos Modificados

### Backend
- ✅ `ChileanPriceUtils.java` — **Creado**
- ✅ `ValidChileanPrice.java` — **Creado**
- ✅ `ChileanPriceValidator.java` — **Creado**
- ✅ `ProveedorProductoUpdateDTO.java` — Actualizado (String + @ValidChileanPrice)
- ✅ `ProveedorProductoAddDTO.java` — Actualizado (String + @ValidChileanPrice)
- ✅ `ProveedorServiceImpl.java` — Actualizado (parseChileanPrice en ambos métodos)

### Frontend
- ✅ `gestion-proveedores.tsx` — Actualizado:
  - `formatChileanPrice()` — Mejorado para preservar decimales
  - `handleGuardarPrecio()` — Envía string formateado
  - `handleGuardarProducto()` — Formatea precio antes de enviar
- ✅ `proveedor.types.ts` — Actualizado:
  - `IProveedorProductoAddDTO.precioProducto` → `string`
  - `IProveedorProductoUpdateDTO.precioProducto` → `string`

---

## 8. Ventajas de Esta Implementación

✅ **Doble validación:** Cliente + servidor  
✅ **UX clara:** Usuario ve formato esperado en el input  
✅ **Flexibilidad:** Acepta múltiples formatos válidos  
✅ **Trazabilidad:** Logging del input original y valor parseado  
✅ **Estándar regional:** Respeta convenciones chilenas  
✅ **Prevención de errores:** No permite precios ≤ 0  

---

## 9. Próximas Mejoras (Opcional)

- [ ] Agregar formateo automático mientras el usuario escribe (input mask)
- [ ] Soporte para múltiples monedas con conversión automática
- [ ] Historial de cambios de precios por proveedor
