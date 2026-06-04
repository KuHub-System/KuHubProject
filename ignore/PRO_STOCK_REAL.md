# PRO_STOCK_REAL — Disponibilidad real de stock vs. demanda de solicitudes

> Documento de problema para conversar con el cliente.
> Fecha: 2026-06-03 · Estado: **análisis / decisión pendiente del cliente**

---

## 1. Qué queremos lograr (objetivo de negocio)

Saber, **en tiempo real y por producto**, cuánto stock está **realmente disponible**
(no comprometido con ninguna solicitud). La fórmula buscada es:

```
disponible(producto) = stock físico (inventario + bodega de tránsito)
                     − demanda comprometida (lo que las recetas/solicitudes ya van a consumir)
```

El resultado responde a la pregunta del cliente:
**"¿Qué productos tengo en bodega que sobran y no están reservados para ninguna solicitud?"**

---

## 2. Cómo se relacionan los datos hoy

```
Solicitud (estado EN_PEDIDO)
   └─ PedidoSolicitud  (tabla intermedia M:N)
        └─ Pedido  (cubre una semana: fecha_inicio → fecha_fin)
             └─ OrdenPedido  (una por proveedor)   estado: CONFIRMADA / RECIBIDA
                  └─ DetalleOrdenPedido  (producto + fecha_entrega + cantidad + entregado)
```

Datos clave:
- La unión **Solicitud ↔ Pedido** existe completa, pero es **a nivel del pedido semanal entero**,
  no por día ni por línea.
- "Lo que de verdad llegó" se marca con el booleano **`entregado`** de cada `DetalleOrdenPedido`
  (cuando todos los detalles quedan entregados, la OP pasa sola a `RECIBIDA`).
- **No existe** un booleano `recibida` en la OP; el "recibido" real es el `entregado` por línea.

---

## 3. El problema central

Para restar la demanda correcta necesitamos saber **qué solicitudes ya se abastecieron**
(sus productos ya están en inventario/bodega). El obstáculo:

> **Al generar la Orden de Pedido NO se guarda qué solicitud originó cada línea.**
> En el pedido "está todo junto": las cantidades llegan consolidadas por producto,
> sin desglose por solicitud.

### Dónde se pierde la traza de la solicitud (3 puntos, en orden)

1. **Consolidación (antes de la pantalla).**
   La cotización consolidada que ve el usuario ya viene **sumada por producto y por día**.
   El identificador de cada solicitud se descarta en esa agregación.

2. **Redistribución automática.**
   El sistema reasigna las cantidades de "día de necesidad" a "día de entrega" del proveedor
   con una lógica de calendario. La cantidad de cada línea ya es una *transformación*, no un espejo.

3. **Redistribución manual (botones ±).**
   El usuario puede mover libremente cantidades entre días de entrega. Es el caso que preocupa:
   **puede meter todo el producto de la semana en un solo día.**

Al final, cada línea de la orden se guarda solo como **`producto + cantidad + fecha de entrega`**,
sin ningún rastro de solicitud.

---

## 4. ¿Por qué no basta con "agregar el id de la solicitud en el detalle de la OP"?

Es la solución intuitiva, pero **no es viable**, por dos razones bloqueantes:

1. **El dato ya no existe en ese punto.** Para poblar esa columna habría que arrastrar el desglose
   por solicitud a través de la consolidación y de las dos redistribuciones. No se puede sin ambigüedad.

2. **La relación es muchos-a-muchos con fusión y división de cantidades.**
   Una línea de la orden (producto + día) puede cubrir varias solicitudes, y una solicitud puede
   repartirse en varias líneas. Después de una edición manual libre, **no hay forma determinista**
   de decir "estos 5 kg son de la solicitud #12 y estos 3 de la #18". Ni un campo único ni una tabla
   puente pueden representar una cantidad editada a mano.

---

## 5. La preocupación del "todo a un solo día" — aclaración importante

Si el usuario concentra todo el producto de la semana en un único día de entrega, **el cálculo de
sobrante NO se rompe**, porque el sobrante es por **producto y semana completa**, no por día:

```
sobrante(producto) = stock_físico_total(producto) − demanda_total_comprometida(producto)
```

Ambos lados se suman sobre toda la semana, sin importar en qué día llegó ni en qué día se pidió.

- Lo que **sí** es imposible (y no tiene solución limpia) es la atribución *día-a-día* o
  *por solicitud específica*: "esta solicitud puntual quedó como sobrante / se sirvió el día X".
  Eso lo destruye, por diseño, la libertad de distribución al generar la orden.
- Para **detectar sobrante por producto**, esa exactitud por día **no hace falta**.

---

## 6. Cómo excluir lo que NO llegó (solicitudes en OP confirmada pero no entregada)

Dentro de un mismo pedido conviven productos ya entregados y productos aún pendientes.
Para no descontar demanda de algo que todavía no llegó, usamos el booleano fino que **sí existe**:

> Un producto **cuenta** para la demanda solo si tiene al menos un `DetalleOrdenPedido`
> con `entregado = TRUE` (activo) en una OP `CONFIRMADA` o `RECIBIDA` de ese pedido.

Así, un producto de una OP confirmada **pero no entregado** queda **excluido automáticamente**
de la resta.

---

## 7. Opciones evaluadas

| Opción | Qué implica | Veredicto |
|---|---|---|
| **A. Sobrante por producto** (sin cambiar la base de datos) | Demanda = suma de los detalles de las solicitudes EN_PEDIDO cuyos productos ya llegaron (`entregado = true`). Stock = inventario + bodega vigentes. | ✅ **Recomendada.** Resuelve el objetivo, es robusta y usa datos que ya tenemos |
| **B. Guardar `id_solicitud` en el detalle de la OP** | Cambio de esquema + reescribir consolidación y redistribución | ❌ No poblable / relación M:N — **no funciona** |
| **C. Atribución exacta por solicitud/día** (ver **Sección 8**) | No alterar cantidades: atar cada línea de la OP a una solicitud y su día | ⚠️ Da **exactitud total**, pero **rompe** la distribución libre (función que el negocio quiere) |

---

## 8. Solución exacta — asignar cada solicitud a su día, **sin alterar cantidades**

Existe una forma de lograr **exactitud total** (por solicitud y día a día), pero exige cambiar
la filosofía de cómo se genera la orden.

### La idea

En lugar de consolidar y permitir redistribución libre, la Orden de Pedido se genera
**directamente desde los detalles de cada solicitud**, conservando el `id_solicitud`
(e idealmente `id_detalle_solicitud`) en cada línea de la OP y respetando el **día que la
solicitud realmente necesita**. La clave es: **no se alteran las cantidades.**

```
detalle_solicitud (solicitud #12, producto P, 5 kg, día martes)
        │  (1:1, sin fusión ni redistribución)
        ▼
detalle_orden_pedido (producto P, 5 kg, fecha martes, id_solicitud = 12)
```

### Por qué da exactitud

Si cada línea de la orden **nace de una solicitud concreta** y nadie fusiona ni mueve cantidades,
la relación deja de ser muchos-a-muchos y pasa a ser **1:1** (o 1:N controlado). Entonces:

- Cada `DetalleOrdenPedido` lleva su `id_solicitud` / `id_detalle_solicitud`.
- Cuando se marca `entregado = true`, sabemos **exactamente** qué solicitud (y qué día) se abasteció.
- El sobrante y "lo no asociado a ninguna solicitud" se calculan con **precisión total, incluso día a día**.

### Qué requiere

1. **Esquema:** agregar `id_solicitud` (y opcionalmente `id_detalle_solicitud`) a `detalle_orden_pedido`.
2. **Flujo de generación:** **quitar o bloquear** la redistribución automática y los botones ± de
   cantidades. La orden se arma 1:1 desde la demanda real por solicitud y día.
3. **Agrupación solo visual:** si se quiere seguir mostrando consolidado por proveedor/día, se hace
   únicamente en pantalla, manteniendo el desglose por solicitud por debajo.

### Qué se pierde (el costo a negociar con el cliente)

- El usuario **ya no podrá distribuir libremente** las cantidades entre días (la flexibilidad actual).
- **Más líneas** en la orden (una por solicitud-producto-día en vez de una consolidada), lo que puede
  fragmentar las cantidades enviadas al proveedor.
- Cambio **mayor** en la pantalla de "Generar Orden de Pedido".

### Variante intermedia (lo mejor de ambos mundos)

Permitir **ver/agrupar** consolidado, pero **mantener internamente la asignación por solicitud**
(una tabla puente `detalle_orden_pedido ↔ detalle_solicitud` con la cantidad asignada a cada una).
Mientras esa asignación **no se edite libremente**, la exactitud se conserva. En el momento en que
se habilite mover cantidades a mano entre días, se vuelve al problema muchos-a-muchos de la Sección 4.

---

## 9. Recomendación

Adoptar la **Opción A**: calcular la disponibilidad **por producto**, sin tocar el esquema,
usando `detalle_orden_pedido.entregado` como señal de "ya llegó".

Acepta una limitación conocida y razonable: si un producto se pidió en varios días y solo se
entregó parte, se cuenta la demanda del producto en bloque (resultado conservador: nunca
sobre-reporta sobrante).

**Reservar la Solución exacta de la Sección 8 solo si el cliente exige precisión por solicitud o
día a día**, aceptando perder la distribución libre de cantidades.

---

## 10. Decisión que necesitamos del cliente

1. **¿Le sirve el sobrante calculado por producto** (Opción A / Sección 9), asumiendo que no habrá
   exactitud día-a-día ni por solicitud individual?
2. Si el cliente **exige** exactitud por solicitud/día, hay que advertirle que eso obliga a
   **quitar la distribución libre** al generar la orden (Sección 8) — un cambio mayor de flujo y de UX.

---

## 11. Resumen en una frase (para el cliente)

> "Podemos decirte con exactitud, producto por producto y en tiempo real, cuánto te sobra después
> de descontar lo que las solicitudes ya abastecidas van a consumir. Lo que no podemos —porque al
> armar la orden las cantidades se consolidan y se reparten libremente entre días— es decir *qué
> solicitud puntual* corresponde a cada kilo entregado. Para el objetivo de detectar sobrantes,
> el detalle por producto es suficiente y confiable."
