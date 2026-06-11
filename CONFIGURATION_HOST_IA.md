# CONFIGURATION_HOST_IA.md — Instancia de Inteligencia Artificial (Ollama)

**Fecha:** 2026-06-08
**Entorno:** Pruebas académicas — AWS Lightsail (Virginia, Zona A)
**Responsable:** Alumno desarrollador
**Documento gemelo:** Ver `CONFIGURATION_HOST_DEVS.md` para la infraestructura App + BD.

> ✅ **Estado:** APROVISIONADA Y OPERATIVA (2026-06-08). Ollama instalado y modelos
> probados/comparados. Pendiente: definir modelo final y la integración backend (Camino A).
>
> | Dato | Valor real |
> |---|---|
> | IP Pública (SSH) | `52.206.92.4` |
> | **IP Privada VPC** | `172.26.14.71` |
> | Ollama | v0.30.7 — `active (running)`, CPU-only |
> | Modelo principal (confirmado) | `qwen2.5:1.5b` |
> | Modelo descartado | `deepseek-r1:1.5b` (ver Benchmark, sección 10) |

---

## 1. Resumen Ejecutivo

Se agrega una **tercera instancia dedicada exclusivamente a IA**, separada de la App y la
BD, corriendo **Ollama** como motor de inferencia local (sin costo de API, sin enviar datos
a terceros).

- **Motor:** Ollama (inferencia **CPU puro** — Lightsail no tiene GPU)
- **Modelo principal:** `qwen2.5:1.5b` (chatbot/texto en español, respuesta directa)
- **Modelo de respaldo:** `deepseek-r1:1.5b` (razonamiento/lógica, más lento)
- **Acceso:** SOLO desde la Instancia A (Backend) vía **VPC Peering**. NO expuesto a Internet.
- **Cliente único:** Backend Spring Boot. El navegador nunca habla directo con Ollama.

### Por qué instancia separada

Las Instancias A (App, 2 GB) y B (BD, 512 MB) no tienen RAM libre para inferencia.
Meter Ollama en la Instancia A provocaría OOM del frontend + backend. La IA se aísla
para poder **apagarla o redimensionarla sin afectar el sistema**.

---

## 2. Topología de Infraestructura

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ Instancia A — Aplicación     │        │ Instancia C — IA (NUEVA)     │
│ 52.5.222.79 — 2 GB           │        │ <PENDIENTE-IP-PUBLICA>       │
│                              │        │ 2 GB + Swap 4 GB             │
│  Backend Spring Boot :8080   │        │ Ubuntu (igual que las demás) │
│   └─ IaService ──────────────┼──VPC──>│  Ollama :11434               │
│                              │        │   • qwen2.5:1.5b (principal) │
│                              │        │   • deepseek-r1:1.5b (resp.) │
│                              │        │   • Escucha SOLO en IP VPC   │
└──────────────────────────────┘        └──────────────────────────────┘
              │                                        │
              └──────────── VPC Peering ───────────────┘
                   172.26.x.x (privado, sin metraje)

┌──────────────────────────────┐
│ Instancia B — Base de Datos  │
│ 13.218.253.211 — 512 MB      │   (sin cambios — no participa de la IA)
│  PostgreSQL 16.13            │
└──────────────────────────────┘
```

---

## 3. Especificaciones de la Instancia C

| Parámetro | Valor |
|---|---|
| **Proveedor** | AWS Lightsail — Virginia, Zona A (misma VPC que A y B) |
| **SO** | Ubuntu (22.04 o 24.04 LTS) |
| **RAM** | 2 GB (plan inicial) |
| **Swap** | 4 GB (archivo `/swapfile` — **obligatorio** para cargar el modelo) |
| **vCPU** | 2 |
| **SSD** | ≥ 40 GB (modelos + SO) |
| **IP Pública** | `<PENDIENTE>` (solo SSH) |
| **IP Privada VPC** | `<PENDIENTE>` (usar SIEMPRE desde el Backend) |
| **Puerto Ollama** | `11434` (escucha solo en IP privada) |

### Distribución de Memoria (2 GB + 4 GB Swap)

| Componente | Estimado |
|---|---|
| Sistema Operativo | ~500–600 MB |
| Modelo cargado (qwen2.5:1.5b, ctx 2048) | ~1.5–2 GB (apoyado en swap) |
| **Disponible real para inferencia** | ~1.4 GB RAM + swap |

⚠️ **Expectativa de rendimiento:** en CPU puro con 2 GB, respuestas cortas tardan
~20–60 s. Suficiente para demo académica, NO para uso fluido en producción.
Si resulta muy lento, el plan B es subir **solo esta instancia** a 4 GB
(~$12 → ~$24/mes) sin tocar el resto del sistema.

---

## 4. Aprovisionamiento — Paso a Paso

> Ejecutar todo dentro de la Instancia C recién creada (Ubuntu), vía SSH.

### 4.1 Swap de 4 GB (CRÍTICO — sin esto el modelo no carga)

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # verificar que Swap = 4.0Gi
```

### 4.2 Instalar Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
systemctl status ollama   # debe quedar active (running)
```

### 4.3 Configurar Ollama para escuchar SOLO en la VPC

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=172.26.14.71:11434"
Environment="OLLAMA_NUM_CTX=2048"
Environment="OLLAMA_KEEP_ALIVE=-1"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Explicación de variables:**
- `OLLAMA_HOST=172.26.14.71:11434` — escucha solo en la red privada, **no en 0.0.0.0** (no expone a Internet).
- `OLLAMA_NUM_CTX=2048` — limita la ventana de contexto → menos RAM.
- `OLLAMA_KEEP_ALIVE=-1` — mantiene el modelo cargado (evita recargas lentas en cada petición).
- `OLLAMA_MAX_LOADED_MODELS=1` — **un solo modelo en RAM a la vez** (evita OOM al alternar Qwen/DeepSeek).

### 4.4 Descargar los modelos

```bash
ollama pull qwen2.5:1.5b      # principal — chatbot/texto en español
ollama pull deepseek-r1:1.5b  # respaldo — razonamiento/lógica

ollama list                   # verificar ambos descargados
```

### 4.5 Prueba local (dentro de la Instancia C)

```bash
curl http://172.26.14.71:11434/api/generate -d '{
  "model": "qwen2.5:1.5b",
  "prompt": "Responde en español: ¿qué es un inventario?",
  "stream": false
}'
```

---

## 5. Seguridad de Red — Firewall

Ollama **no debe ser accesible desde Internet**. Doble candado:

1. **Bind a IP privada** (ya hecho con `OLLAMA_HOST` en el paso 4.3).
2. **Firewall de Lightsail (Networking → IPv4 Firewall):**
   - Permitir **SSH (22)** solo desde tu IP de administración.
   - **NO** abrir el puerto `11434` en el firewall público.
   - El tráfico VPC entre Instancia A y C es interno y no pasa por el firewall público.

Verificación de que NO está expuesto (desde fuera de la VPC debe fallar/timeout):

```bash
curl http://<IP-PUBLICA-INSTANCIA-C>:11434/   # debe dar timeout o connection refused
```

---

## 6. Integración con el Backend (pendiente — Camino A futuro)

> Esta sección documenta el contrato previsto. El **código aún no está implementado**
> (se decidió documentar primero — Camino B).

### Flujo previsto

```
Frontend ──POST /api/v1/ia/chat──> Backend (valida JWT + permiso)
                                       └─ IaService ──VPC──> Ollama /api/generate
```

### Variables de entorno previstas (Backend — docker-compose / application.properties)

```properties
# URL de Ollama por la VPC privada (NUNCA la IP pública)
kuhub.ia.ollama-url=http://172.26.14.71:11434
# Modelo activo — cambiar entre qwen2.5:1.5b y deepseek-r1:1.5b sin recompilar
kuhub.ia.model=qwen2.5:1.5b
kuhub.ia.timeout-seconds=120
```

### Endpoint Ollama que consumirá el backend

```
POST http://172.26.14.71:11434/api/generate
Body: { "model": "${kuhub.ia.model}", "prompt": "...", "stream": false }
```

> Nota: `deepseek-r1` devuelve un bloque `<think>...</think>` antes de la respuesta.
> El `IaService` deberá **filtrar ese bloque** antes de devolver el texto al frontend
> si se usa el modelo de respaldo. `qwen2.5` no genera ese bloque.

---

## 7. Operación y Troubleshooting

| Acción | Comando |
|---|---|
| Estado de Ollama | `systemctl status ollama` |
| Reiniciar Ollama | `sudo systemctl restart ollama` |
| Ver logs | `journalctl -u ollama -f` |
| Listar modelos | `ollama list` |
| Ver RAM/Swap | `free -h` |
| Cambiar modelo activo | Editar `kuhub.ia.model` en el Backend (no requiere tocar la Instancia C) |

### Síntomas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| Ollama "killed" / OOM | Modelo no entra en RAM | Verificar swap activo (`free -h`); bajar `OLLAMA_NUM_CTX` |
| Respuestas muy lentas | CPU puro, esperado | Considerar subir instancia a 4 GB |
| Backend no conecta | URL apunta a IP pública o puerto cerrado | Usar IP **privada** VPC; revisar `OLLAMA_HOST` |
| Respuesta con texto raro/chino | Modelo `deepseek-r1` en español | Usar `qwen2.5:1.5b` como principal |

---

## 8. Costos Estimados (Lightsail)

| Escenario | Plan | Costo aprox. |
|---|---|---|
| **Inicial (este doc)** | 2 GB / 2 vCPU / 60 GB | ~$12/mes |
| **Plan B (si va lento)** | 4 GB / 2 vCPU / 80 GB | ~$24/mes |

Ventaja del aislamiento: redimensionar la IA **no afecta** el costo ni el uptime de las
Instancias A y B. La instancia se puede **apagar** cuando no se demuestra, ahorrando costo.

---

## 9. Checklist de Aprovisionamiento

- [x] Crear Instancia C en Lightsail (Ubuntu 22.04.5, 2 GB, misma VPC/Zona que A y B)
- [x] Anotar IP pública (`52.206.92.4`) e **IP privada VPC** (`172.26.14.71`)
- [x] Configurar swap de 4 GB persistente en `/etc/fstab` (paso 4.1)
- [x] Instalar Ollama v0.30.7 (paso 4.2)
- [x] Configurar `OLLAMA_HOST=172.26.14.71:11434` (paso 4.3)
- [x] `ollama pull qwen2.5:1.5b` y `deepseek-r1:1.5b` (paso 4.4)
- [x] Probar inferencia local + benchmark comparativo (paso 4.5 / sección 10)
- [ ] Verificar en consola Lightsail que el puerto 11434 NO está expuesto (firewall) (sección 5)
- [x] Decidir modelo final (Qwen 1.5b confirmado; candidatos 3b/2b/1b evaluados — sección 10.4/10.5)
- [ ] Pasar la IP privada VPC al desarrollador para implementar `IaService` (Camino A)

---

## 10. Benchmark de Modelos (2026-06-08)

Pruebas reales ejecutadas en la Instancia C (2 GB, CPU puro), respuesta no-streaming.

### 10.1 Resultados

| # | Tarea | Modelo | Tiempo | Resultado |
|---|---|---|---|---|
| 1 | Definir "gestión de inventario" (1 frase, español) | `qwen2.5:1.5b` | ~17 s | ✅ Correcta y bien redactada |
| 1 | Misma tarea | `deepseek-r1:1.5b` | ~48 s | ❌ Confundió "restaurante" con "fiesta" |
| 2 | Cálculo lógico (17 kg ÷ 3 kg/día) | `deepseek-r1:1.5b` | **~172 s** | ⚠️ Resultado correcto (5 días, sobran 2 kg) pero español roto |
| 3 | Redactar aviso a proveedor (español formal) | `deepseek-r1:1.5b` | ~37 s | ❌ Incoherente, inventa palabras ("desviño"), fuera de tema |

### 10.2 Conclusión

- **`qwen2.5:1.5b` → MODELO PRINCIPAL CONFIRMADO.** Rápido (~17 s), español correcto, responde directo (sin bloque de razonamiento que filtrar).
- **`deepseek-r1:1.5b` → DESCARTADO para producción en español.** Aun cuando acierta la lógica, es 3–10× más lento y redacta con errores graves de concordancia y coherencia. Su naturaleza de "modelo de razonamiento" no aporta en este caso de uso (chatbot/texto en español) y penaliza el tiempo en CPU.

### 10.3 Otros modelos candidatos a evaluar (todos caben en 2 GB con swap)

| Modelo | Tamaño aprox. | Perfil esperado |
|---|---|---|
| `qwen2.5:3b` | ~1.9 GB | Mejor calidad que el 1.5b, más lento (justo en 2 GB) |
| `llama3.2:3b` | ~2.0 GB | Multilingüe sólido (Meta), buen español |
| `gemma2:2b` | ~1.6 GB | Google, buena redacción en español |
| `llama3.2:1b` | ~1.3 GB | Muy rápido, calidad menor |

> `deepseek-r1:7b`/`8b` (~5 GB) NO es viable en 2 GB: swapearía masivamente
> (respuestas de varios minutos). Solo evaluable subiendo la instancia a 8 GB.

### 10.4 Segunda ronda — resultados reales de los candidatos 10.3 (2026-06-09)

Pruebas en la Instancia C (2 GB, CPU puro, swap 4 GB). Mismo prompt para todos:
*"Responde en español, breve y claro: ¿qué es la gastronomía internacional?"*.
Mediciones tomadas de los campos `load_duration` / `eval_duration` / `eval_count` /
`total_duration` que devuelve `/api/generate` (stream=false).

| Modelo | Tamaño | Carga (frío) | Inferencia (eval) | Tokens | Total | Español | Veredicto |
|---|---|---|---|---|---|---|---|
| `qwen2.5:1.5b` (principal actual) | 986 MB | rápida | — | — | ~17 s | ✅ Correcto | ✅ **Principal confirmado** (ronda 1) |
| `qwen2.5:3b` | 1.9 GB | 67.4 s | **947.6 s** | 44 | ~1015 s (~16 min) | ✅ Correcto | ❌ Inviable — *thrashing* de swap |
| `llama3.2:3b` | 2.0 GB | 136.2 s | **2405.4 s** | 76 | ~2598 s (~43 min) | ✅ Muy bueno | ❌ Inviable — el peor en tiempo |
| `gemma2:2b` | 1.6 GB | 67.2 s | **7.6 s** | 31 | 121 s | ✅ Bueno, conciso (usa **negritas** markdown) | ⚠️ Viable solo si queda cargado (`KEEP_ALIVE=-1`) |
| `llama3.2:1b` | 1.3 GB | 12.7 s | **11.4 s** | 61 | 27 s | ✅ Bueno, fluido | ✅ Viable — rápido y liviano |

**Lectura de los datos:**

- **Clase 3b → descartada definitivamente** en 2 GB. `qwen2.5:3b` y `llama3.2:3b` cargan a
  swap y la inferencia se desploma a ~21–32 s **por token** (16 y 43 min para una sola
  respuesta corta). La calidad del español es buena, pero el tiempo es inaceptable incluso
  para demo. Solo serían viables subiendo la instancia a 4–8 GB.
- **`gemma2:2b`** es el dato interesante: una vez cargado, la **inferencia es la más rápida
  de todas (7.6 s para 31 tokens)**. El costo es la carga en frío (67 s, porque roza el
  límite de RAM y swapea al cargar). Con `OLLAMA_KEEP_ALIVE=-1` la carga ocurre una sola vez,
  así que en operación real las consultas rondan ~8–10 s. Redacción buena y concisa. Riesgo:
  queda al filo de la RAM; si el SO necesita memoria podría descargarse y volver a pagar los 67 s.
- **`llama3.2:1b`** es el candidato más **seguro y equilibrado**: liviano (1.3 GB, holgura de
  RAM), 27 s en frío / ~11 s de inferencia, español fluido. No tiene el riesgo de RAM de gemma2.

> 🧹 **Limpieza (2026-06-09):** `qwen2.5:3b`, `llama3.2:3b` y `deepseek-r1:1.5b` fueron
> **desinstalados del servidor** (`ollama rm`) por lentos. La Instancia C queda **solo con los
> 3 modelos seleccionables y rápidos**: `qwen2.5:1.5b`, `llama3.2:1b`, `gemma2:2b`
> (disco usado: ~12 GB de 58 GB).

### 10.5 Conclusión de la comparativa

Para el caso de uso (chatbot en español, respuesta directa, 2 GB CPU puro), el orden de
preferencia queda:

1. **`qwen2.5:1.5b`** — principal actual. Rápido, español correcto, holgado en RAM. **Se mantiene.**
2. **`llama3.2:1b`** — alternativa más liviana y veloz; buena si se quiere bajar aún más la RAM.
3. **`gemma2:2b`** — mejor redacción y la inferencia más rápida *si permanece cargado*, pero
   al límite de RAM (carga en frío de 67 s si se descarga).
4. ❌ **`qwen2.5:3b` / `llama3.2:3b`** — descartados: inviables en 2 GB por swap.

> El modelo se cambia sin recompilar vía la propiedad `kuhub.ia.model` (o env `KUHUB_IA_MODEL`)
> y reiniciando el backend. Ver sección 12.4.

---

## 11. Inventario de archivos de la implementación IA (rama `feature/ia-ollama`)

> ⚠️ **TODO esto debe quedar en la rama `feature/ia-ollama`, NO en `master`.**
> La IA está fuera del alcance del proyecto (es una prueba para mostrar al cliente).
> Esta lista existe para revisar qué stagear y qué NO al hacer commits.

### 11.1 Backend — archivos NUEVOS (puros de IA, seguros de commitear en la rama)

```
backend/src/main/java/KuHub/modules/asistente_ia/config/IaConfig.java
backend/src/main/java/KuHub/modules/asistente_ia/controller/IaController.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/request/MensajeDTO.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/request/IaChatRequestDTO.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/response/IaChatResponseDTO.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/ollama/OllamaMessage.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/ollama/OllamaOptions.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/ollama/OllamaChatRequest.java
backend/src/main/java/KuHub/modules/asistente_ia/dtos/ollama/OllamaChatResponse.java
backend/src/main/java/KuHub/modules/asistente_ia/exception/AsistenteIaException.java
backend/src/main/java/KuHub/modules/asistente_ia/service/IaService.java
backend/src/main/java/KuHub/modules/asistente_ia/service/IaServiceImpl.java
```

### 11.2 Backend — archivos MODIFICADOS (existen en master; revisar el diff antes de mover)

```
backend/src/main/java/KuHub/config/security/SpringSecurityConfig.java   (+ ruta /api/v1/ia/**)
backend/src/main/resources/application.properties                       (+ bloque kuhub.ia.*)
```

### 11.3 Frontend — archivos NUEVOS (puros de IA)

```
frontend/src/services/ia-service.ts
frontend/src/components/modals/ia-chat-modal.tsx
```

### 11.4 Frontend — archivos MODIFICADOS (⚠️ COMPARTIDO con las mejorías)

```
frontend/src/components/header.tsx   (+ botón IA y render del modal)
```

> ⚠️ **`header.tsx` es delicado:** el otro chat (mejorías) también lo edita en el mismo
> working tree. Contiene cambios de IA **y** de mejorías mezclados. Al separar commits,
> revisar el diff de este archivo con cuidado (`git diff header.tsx`) para no arrastrar
> mejorías a la rama de IA ni IA a master.

### 11.5 Otros

```
.gitignore                                                  (+ ignora CONFIGURATION_HOST_IA.md — este documento)
backend/src/main/resources/application-mat.properties       (+ override local kuhub.ia.ollama-url=http://localhost:11434 · GITIGNOREADO, no commitea)
docker-compose.yml                                          (+ env KUHUB_IA_* hardcodeadas para el deploy · COMPARTIDO, revisar diff)
```

> **Estado de commits (rama `feature/ia-ollama`, pusheada a origin):**
> - `e963922` feat(ia): módulo backend + chat frontend + selección de modelos (18 archivos, solo IA).
> - `992e0f3` chore(ia): expone config de Ollama en `docker-compose.yml`.
> Las mejorías (gestion_orden_pedido, gestion_notificacion, etc.) quedaron SIN commitear en el
> working tree, para ir a master desde el otro chat.

### 11.6 Resumen para el commit de la rama

| Categoría | Acción al commitear |
|---|---|
| 11.1 / 11.3 (NUEVOS) | `git add` directo — solo existen por la IA |
| 11.2 / 11.4 (MODIFICADOS) | Revisar diff; stagear solo las líneas de IA si el archivo es compartido |
| `header.tsx` | **Inspección manual obligatoria** antes de stagear |

### 11.7 Estrategia para no contaminar master y reusar el frontend después

> **Idea clave:** la rama `feature/ia-ollama` ES el "escondite". **Nada se borra** — el chat
> de IA (frontend y backend) vive intacto en la rama y se puede levantar cuando quieras.

- **Archivos 100 % IA** (11.1 y 11.3 — incluyendo `ia-service.ts` e `ia-chat-modal.tsx`):
  solo existen en la rama. `master` nunca los ve. No hay que "esconder" nada: simplemente
  no se crean en master.
- **Archivos compartidos** (11.2 y 11.4): existen en master, pero las **líneas** de IA solo
  se commitean en la rama. Al commitear en master, revisar el diff y **excluir las líneas de IA**
  (sobre todo en `header.tsx`, que tiene IA + mejorías mezcladas).
- **Para mostrar/usar la IA después:** `git checkout feature/ia-ollama` (o mergear la rama a una
  de demo). Como nada se elimina, el frontend del chat sigue completo y funcional en la rama.
- **Para mantener la rama al día con master:** periódicamente
  `git checkout feature/ia-ollama && git merge master` (trae las mejorías de master a la rama
  sin llevar la IA a master).
- **Verificar antes de commitear a master** que ningún archivo de IA se coló:
  `git status` no debe listar archivos de 11.1/11.3, y `git diff --cached header.tsx`
  no debe contener el botón ✨ ni `IaChatModal`.

> ⚠️ Esta ronda (selector de modelos, 2026-06-09) **no creó archivos nuevos**: reutilizó
> `IaChatRequestDTO.java`, `IaServiceImpl.java`, `application.properties`, `ia-service.ts` y
> `ia-chat-modal.tsx` (todos ya listados arriba). El inventario 11.1–11.5 sigue siendo completo.

---

## 12. Implementación realizada (módulo `asistente_ia`)

### 12.1 Qué se construyó

- **Backend:** módulo nuevo `KuHub/modules/asistente_ia` con un único endpoint REST que valida JWT,
  arma la conversación con un *system prompt* en español, llama a Ollama por HTTP (`RestClient`),
  filtra el bloque `<think>` de DeepSeek y traduce fallos de red a status HTTP claros.
- **Frontend:** servicio tipado + modal tipo chat, abierto desde un botón ✨ en el header
  (a la izquierda de las notificaciones).
- **Arquitectura:** el navegador nunca habla con Ollama; siempre pasa por el backend, que es el
  único que alcanza la instancia de IA (por VPC en producción, por túnel SSH en local).

#### Selección de modelo (2026-06-09)

- El frontend permite **alternar entre 3 modelos** desde un selector en el header del modal:
  `qwen2.5:1.5b` (principal), `llama3.2:1b` y `gemma2:2b`. Ver benchmark §10.4.
- El modal **muestra el tiempo promedio** de cada modelo (en el subtítulo y en el indicador
  "Cocinando...") para fijar expectativas del usuario.
- El **timeout del frontend se ajusta por modelo** (90 s qwen / 110 s llama / 125 s gemma2,
  este último cubre su carga en frío ~70 s) — ver `MODELOS_IA` en `ia-service.ts`.
- El backend recibe el `modelo` en el request pero lo valida contra una **whitelist**
  (`kuhub.ia.allowed-models`); cualquier valor fuera de la lista cae al principal. Esto evita
  que el cliente fuerce un modelo pesado (p. ej. 7B) que tumbaría la instancia de 2 GB.
- Cada mensaje (usuario e IA) muestra su **hora** (`HH:mm`) de forma sutil dentro de la burbuja.
- Al **cambiar de modelo** se inserta un aviso centrado, gris y semitransparente en la conversación.
- **Badge de no leídos:** si la IA responde con el modal cerrado, el botón ✨ del header muestra
  un contador rojo (mismo estilo que el badge de notificaciones); se reinicia al abrir el chat.
- **Auto-scroll:** al abrir el chat se posiciona abajo (en lo más reciente), no arriba.
- Detalles visuales (hora, bienvenida, avisos de sistema) son **solo del frontend**: se filtran y
  nunca se envían al backend (que solo recibe `{ rol, contenido }`).

### 12.2 Contrato del endpoint

```
POST /api/v1/ia/chat        (requiere JWT — cualquier usuario autenticado)

Request  (IaChatRequestDTO):
  { "mensajes": [ { "rol": "user|assistant", "contenido": "..." }, ... ] }   // máx. 30, contenido ≤ 4000

Response 200 (IaChatResponseDTO):
  { "respuesta": "...", "modelo": "qwen2.5:1.5b", "duracionMs": 9442 }

Errores:
  504 GATEWAY_TIMEOUT  → Ollama no respondió a tiempo / IP no alcanzable
  502 BAD_GATEWAY      → Ollama caído o respuesta vacía
  Body de error: { "mensaje": "texto amigable en español" }
```

### 12.3 Flujo

```
Header (botón ✨) → IaChatModal → ia-service.ts ──POST /api/v1/ia/chat──> IaController
   → IaService (antepone system prompt, opciones num_ctx/num_predict)
   → RestClient ──POST {ollama}/api/chat (stream=false)──> Ollama (qwen2.5:1.5b)
   → limpia <think> → IaChatResponseDTO → modal renderiza la respuesta
```

### 12.4 Configuración (properties)

| Propiedad | Default (prod) | Override local (perfil `mat`) | Env var |
|---|---|---|---|
| `kuhub.ia.ollama-url` | `http://172.26.14.71:11434` | `http://localhost:11434` | `KUHUB_IA_OLLAMA_URL` |
| `kuhub.ia.model` | `qwen2.5:1.5b` | — | `KUHUB_IA_MODEL` |
| `kuhub.ia.allowed-models` | `qwen2.5:1.5b,llama3.2:1b,gemma2:2b` | — | `KUHUB_IA_ALLOWED_MODELS` |
| `kuhub.ia.timeout-seconds` | `120` | — | `KUHUB_IA_TIMEOUT` |
| `kuhub.ia.num-ctx` | `2048` | — | `KUHUB_IA_NUM_CTX` |
| `kuhub.ia.num-predict` | `512` | — | `KUHUB_IA_NUM_PREDICT` |

> El bean `RestClient` lee la URL **una sola vez al arrancar** → cambiar la propiedad exige reiniciar.
> `IaConfig` loguea al inicio: `Asistente IA → URL de Ollama configurada: <url>` para verificar cuál cargó.

### 12.5 Probar en local (PC del desarrollador)

La instancia de IA escucha solo en la VPC (`172.26.14.71`), inalcanzable desde el PC. Para probar:

1. **Túnel SSH** (dejar abierto mientras se prueba):
   ```
   ssh -i <key.pem> -N -L 11434:172.26.14.71:11434 ubuntu@52.206.92.4
   ```
2. **Apuntar el backend a `localhost:11434`** por una de estas vías:
   - Activar perfil `mat` (usa el override de `application-mat.properties`), **o**
   - Env var `KUHUB_IA_OLLAMA_URL=http://localhost:11434` (independiente del perfil).
3. **Reiniciar el backend** y confirmar en el log que la URL es `http://localhost:11434`.
4. Mantener `qwen2.5:1.5b` cargado en el servidor (`OLLAMA_KEEP_ALIVE=-1`); respuesta ~10-15 s en CPU.

> ⚠️ Activar el perfil `mat` también cambia el datasource a `localhost:5433/kuhub_devs`.
> Si la BD local está en otro puerto/nombre, preferir la **env var** para no alterar la BD.

### 12.6 Deploy (Docker / GitHub Actions)

- El deploy se dispara al **pushear un tag `K*.*.*`** (`.github/workflows/deploy.yml`): compila el
  JAR (incluye el módulo IA), construye/pushea imágenes a Docker Hub y levanta en Lightsail vía
  `docker-compose.yml`. **Pushear la rama NO despliega**; solo los tags.
- En prod corre con `SPRING_PROFILES_ACTIVE=prod`. **No existe** `application-prod.properties`,
  así que el `application.properties` base se carga igual y el default de `kuhub.ia.ollama-url`
  (`http://172.26.14.71:11434`, IP privada VPC) es el valor correcto de producción.
- Para que la IA funcione en el deploy basta con: (1) la Instancia C encendida con Ollama, y
  (2) que el contenedor del backend alcance `172.26.14.71` por la VPC (salida NAT del contenedor).
- `docker-compose.yml` expone las `KUHUB_IA_*` **hardcodeadas** (URL VPC, modelo, whitelist) para
  que quede explícito y rastreable. **TODO:** mover a GitHub Secrets / `.env` del servidor.
- ⚠️ La IA solo está en la rama `feature/ia-ollama`. Para desplegarla habría que taggear un commit
  que la incluya (mergear la rama). Mientras tanto, los tags sobre master NO llevan IA.

---

*Documento de configuración de la Instancia de IA de KuHub. Mantener sincronizado con
`CONFIGURATION_HOST_DEVS.md`. Última actualización: 2026-06-08 — implementación backend + frontend (módulo asistente_ia) + guía de prueba local.*
