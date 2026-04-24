# Implementación: Tabla `proveedor_dia_entrega` — Días de Entrega del Proveedor

**Fecha:** 2026-04-24  
**Status:** ✅ COMPLETADO

## Resumen

Se implementó la entity, repository, DTO y lógica de negocio para la tabla `proveedor_dia_entrega`
que ya existía en la base de datos. Esta tabla vincula proveedores con sus días y horarios de entrega.

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `enums/DiaSemana.java` | Enum Java que mapea `dia_semana_type` de PostgreSQL (LUNES–DOMINGO) |
| `entity/ProveedorDiaEntrega.java` | Entity JPA que mapea la tabla `proveedor_dia_entrega` con PK, FK a proveedor, día, hora inicio/fin |
| `dtos/request/DiaEntregaDTO.java` | DTO de request con campos: diaSemana (obligatorio), horaInicio, horaFin (opcionales) |
| `repository/ProveedorDiaEntregaRepository.java` | Repository con `findByProveedor_IdProveedor` y `deleteAllByIdProveedor` |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `entity/Proveedor.java` | Agregada relación `@OneToMany` con `ProveedorDiaEntrega` (cascade ALL, orphanRemoval true) |
| `dtos/request/ProveedorCreateDTO.java` | Agregado campo `List<DiaEntregaDTO> diasEntrega` con `@Valid` |
| `dtos/request/ProveedorUpdateDTO.java` | Agregado campo `List<DiaEntregaDTO> diasEntrega` con `@Valid` |
| `service/ProveedorServiceImpl.java` | Inyectado `ProveedorDiaEntregaRepository`. Método `create()`: guarda días de entrega después de crear el proveedor. Método `update()`: elimina días existentes y los reemplaza (estrategia delete+insert). Nuevo método privado `buildDiasEntrega()` con validaciones de enum, formato de hora, coherencia hora inicio < fin, y duplicados |

## Lógica de negocio implementada

### En `create(ProveedorCreateDTO dto)`:
- Si `dto.diasEntrega` no es null y no está vacío, construye y persiste los días de entrega asociados al proveedor recién creado.

### En `update(Integer idProveedor, ProveedorUpdateDTO dto)`:
- Si `dto.diasEntrega` no es null (incluso si está vacío), elimina todos los días existentes del proveedor y los reemplaza con los nuevos.
- Si `dto.diasEntrega` es null, no se tocan los días existentes (actualización parcial).
- Estrategia: **delete + insert** (reemplazo completo) para simplificar la lógica y evitar comparaciones complejas.

### Método privado `buildDiasEntrega()`:
- Valida que cada `diaSemana` sea un valor válido del enum `DiaSemana`.
- Parsea `horaInicio` y `horaFin` como `LocalTime` (formatos HH:mm o HH:mm:ss).
- Valida que `horaInicio < horaFin` cuando ambas se proporcionan (coherente con CHECK de BD).
- Valida que no haya días duplicados en la misma lista.
- Lanza `GestionProveedorException` con `HttpStatus.BAD_REQUEST` en caso de error.

## Validaciones implementadas

| Validación | Ubicación | Error |
|------------|-----------|-------|
| `diaSemana` es un valor válido del enum | `buildDiasEntrega()` | `BadRequest` con valores válidos |
| Formato `horaInicio` y `horaFin` (HH:mm o HH:mm:ss) | `buildDiasEntrega()` | `BadRequest` con instrucciones de formato |
| `horaInicio < horaFin` (coherencia) | `buildDiasEntrega()` | `BadRequest` |
| No hay días duplicados en la lista | `buildDiasEntrega()` | `BadRequest` |
| UNIQUE(id_proveedor, dia_semana) en BD | Constraint SQL | BD rechaza duplicados |
| CHECK(hora_inicio_entrega < hora_fin_entrega) | Constraint SQL | BD rechaza horas incoherentes |

## Endpoints afectados

Aunque no se crearon endpoints nuevos, estos endpoints ahora soportan días de entrega:

- `POST /api/v1/proveedor` — crea proveedor con días de entrega (opcionalmente)
- `PATCH /api/v1/proveedor/{id}` — actualiza proveedor y reemplaza días de entrega (si se envían)

**Request body ejemplo** (create):
```json
{
  "nombreDistribuidora": "Distribuidora XYZ",
  "nombreProveedor": "Juan García",
  "telefonoProveedor": "+56912345678",
  "rutProveedor": "12345678-9",
  "emailProveedor": "juan@xyz.com",
  "estadoProveedor": "DISPONIBLE",
  "diasEntrega": [
    {
      "diaSemana": "LUNES",
      "horaInicio": "08:00",
      "horaFin": "17:00"
    },
    {
      "diaSemana": "MIERCOLES",
      "horaInicio": "09:30",
      "horaFin": "16:30"
    }
  ]
}
```

## Notas

- La tabla `proveedor_dia_entrega` ya estaba creada en la BD con sus constraints (`uk_proveedor_dia`, `chk_horas_logicas_entrega`, FK cascade).
- No se requirieron cambios en `SpringSecurityConfig` porque los endpoints de proveedor ya están registrados.
- No se crearon endpoints nuevos; los días de entrega se gestionan como parte del flujo de crear/editar proveedor.
- La estrategia delete+insert es correcta para este caso porque simplifica la lógica y el volumen de datos esperado es bajo (máximo 7 días por proveedor).

## Archivos completamente implementados

✅ Enum DiaSemana  
✅ Entity ProveedorDiaEntrega  
✅ DTO DiaEntregaDTO  
✅ Repository ProveedorDiaEntregaRepository  
✅ Relación @OneToMany en Proveedor  
✅ Campos diasEntrega en ProveedorCreateDTO  
✅ Campos diasEntrega en ProveedorUpdateDTO  
✅ Imports en ProveedorServiceImpl  
✅ Inyección ProveedorDiaEntregaRepository  
✅ Lógica en create()  
✅ Lógica en update()  
✅ Método privado buildDiasEntrega() con todas las validaciones

## Testing recomendado

```bash
# Crear proveedor con días de entrega
curl -X POST http://localhost:8080/api/v1/proveedor \
  -H "Content-Type: application/json" \
  -d '{"nombreDistribuidora":"Test","nombreProveedor":"Contact","telefonoProveedor":"123456","diasEntrega":[{"diaSemana":"LUNES","horaInicio":"08:00","horaFin":"17:00"}]}'

# Actualizar con nuevos días
curl -X PATCH http://localhost:8080/api/v1/proveedor/1 \
  -H "Content-Type: application/json" \
  -d '{"diasEntrega":[{"diaSemana":"MARTES","horaInicio":"09:00","horaFin":"18:00"}]}'

# Eliminar todos los días (enviar array vacío)
curl -X PATCH http://localhost:8080/api/v1/proveedor/1 \
  -H "Content-Type: application/json" \
  -d '{"diasEntrega":[]}'
```
