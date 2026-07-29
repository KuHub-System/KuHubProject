# MÓDULOS PENDIENTES

Documento de seguimiento de implementaciones pendientes por módulo. A diferencia de `PENDIENTES.MD`
(bugs y refactors puntuales), este archivo agrupa mejoras/features pendientes **por módulo de negocio**,
para priorizar y planificar antes de implementar.

---

## 📦 Módulo: Gestión de Solicitudes (`gestion_solicitud`)

### ⚠️ Pendiente — Backend: test roto en `SolicitudServiceImplTest`

**Área:** Backend. **Estado:** Detectado 2026-07-21, no corregido. **Dificultad estimada: Media**
(requiere revisar la lógica real de `findSolicitationsPerWeekRaw` contra su query nativa, no es un
simple ajuste de mock).

**Contexto:** al correr el test suite completo del backend (`./mvnw -f backend/pom.xml -o test`) para
validar cambios de otros módulos, aparece esta falla preexistente y no relacionada:

```
SolicitudServiceImplTest.test5FindSolicitationsPerWeekRaw
java.lang.ArrayIndexOutOfBoundsException: Index 10 out of bounds for length 10
    at KuHub.modules.gestion_solicitud.service.SolicitudServiceImp.findSolicitationsPerWeekRaw(SolicitudServiceImp.java:237)
```

El test arma un `Object[]` simulado con 10 columnas, pero el método real intenta acceder al índice
`[10]` (la 11ª columna). Hay que comparar la query nativa asociada contra
`SolicitudServiceImp.java:237` para saber cuál de los dos quedó desactualizado: si el método lee una
columna de más que ya no corresponde al `SELECT` nativo actual, o si el `Object[]` de prueba le falta
una columna real.

**Por qué importa ahora:** el nuevo job `test` de CI (`.github/workflows/deploy.yml` y
`deploy-prod.yml`, agregado 2026-07-29) corre el módulo completo de tests backend antes de cualquier
deploy — esta falla bloquea el gate hasta que se corrija.

**Siguiente paso:** revisar `SolicitudServiceImp.java:237` contra la query nativa que alimenta
`findSolicitationsPerWeekRaw` y decidir si el fix es en el método o en el test.
