# 🎯 Flujo de Trabajo: Haiku (Coordinador) → Sonnet (Ejecutor)

## ⚙️ CONFIGURACIÓN CRÍTICA — ANTES DE USAR AIDER

### PASO 0: Configura variables de entorno en PowerShell

**SIN ESTO, AIDER NO FUNCIONA CON BEDROCK/SONNET/LLAMA**

```powershell
# 1. Agregar Scripts de Python al PATH
$env:Path += ";C:\Users\Matheus\AppData\Roaming\Python\Python312\Scripts"

# 2. Llaves de AWS (Desbloquea todos los Claude y Llama en Bedrock)
$env:AWS_ACCESS_KEY_ID="AKIAWUWVQ7MYVLKB7BNM"
$env:AWS_SECRET_ACCESS_KEY="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"
$env:AWS_REGION="us-east-1"

# 3. Llave de Google (Desbloquea a los Gemini)
$env:GEMINI_API_KEY="AIzaSyB2FkkMi5-QaylDMqdtOP6_3qLMR6oxh4E"

# 4. Verifica que Aider funciona
aider --version
```

**⚠️ IMPORTANTE**: Si cierras PowerShell y abres una nueva ventana, **debes volver a configurar las variables de entorno**. Son de sesión, no permanentes.

### Verificar que Aider ve los modelos disponibles

```powershell
# Ver todos los modelos disponibles en Bedrock
aider --list-models | grep -E "bedrock|sonnet|llama"
```

---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO (Tú)                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
    ┌──────────┐         ┌──────────┐
    │  Claude  │         │  Aider   │
    │  Code    │         │ (Sonnet) │
    │ (Haiku)  │         │          │
    └──────────┘         └──────────┘
         │                    ▲
         │ Lee secrets.md      │
         │ Coordina            │ Ordena qué hacer
         │ Decide modelo       │
         │ Recomienda /add     │
         └────────────────────┘

Costo: 70% más económico que usar Sonnet directamente
```

---

## 🔄 FLUJO PASO A PASO

### PASO 1: Usuario pide algo en Claude Code (Haiku)

```
Usuario: "Necesito agregar un campo 'descripción' a los productos"
```

### PASO 2: Haiku analiza usando `secrets.md`

```
Haiku piensa:
✓ Es cambio frontend + backend
✓ Necesita: componentes React, tipos TypeScript, endpoint Java
✓ Complejidad: media
✓ Modelo recomendado: Sonnet (mejor para refactoring complejo)
```

### PASO 3: Haiku responde con instrucciones

```
✅ Entendido. Haiku aquí como coordinador.

Esto requiere cambios en frontend Y backend. 
Usaremos Sonnet para mejor precisión.

**En tu terminal, corre:**
aider --model bedrock/global.anthropic.claude-sonnet-4-6 --no-auto-commit

**En Aider, ejecuta estos comandos:**
/add frontend/src/types/inventario.types.ts
/add frontend/src/components/
/add backend/src/main/java/KuHub/modules/gestion_inventario/

**Luego pídele a Sonnet:**
"Agrega un campo 'descripcion' (string, 500 caracteres max) 
a la entidad Producto. Actualiza:
- Frontend types
- React form en inventario.tsx  
- Backend DTO y Entity
- Validaciones"

**Resultado esperado:**
- Campo visible en formulario
- Validación de longitud
- Se guarda en BD
- Aparece en listados
```

### PASO 4: Usuario ejecuta en Aider

El usuario copia y pega los comandos en Aider. Sonnet ejecuta.

### PASO 5: Sonnet hace el cambio

Sonnet cambia:
- ✅ Frontend types
- ✅ Form React
- ✅ Backend DTO/Entity
- ✅ Validaciones

El cambio se refleja en disco (sin commits automáticos).

### PASO 6: Usuario revisa cambios

Usuario revisa los cambios en su IDE antes de commitear manualmente.

---

## 💰 EJEMPLO DE AHORRO Y COSTOS REALES

### Opción A: Solo Sonnet (Caro)
```
Usuario pide algo → Sonnet analiza TODO → Sonnet ejecuta
Costo: ⭐⭐⭐ (3x por sesión, ~$0.30-0.50)
```

### Opción B: Haiku coordina + Sonnet ejecuta (Económico)
```
Usuario pide algo → Haiku analiza (muy barato, <$0.01)
                  → Haiku recomienda modelo
                  → Usuario ejecuta en Aider
                  → Sonnet ejecuta SOLO lo necesario
Costo: ⭐⭐ (2x por sesión, ~$0.06-0.12)
```

**Diferencia**: 70% más barato con Haiku coordinando.

### 📊 COSTOS REALES — 2026-04-21

**Tarea**: Corregir flujo de cantidad de ingredientes en solicitud.tsx (~1200 líneas)

| Concepto | Cantidad | Notas |
|----------|----------|-------|
| **Tokens enviados** | 20,000 | Incluye análisis Haiku + lectura de archivos |
| **Tokens recibidos** | 15,000 | Sonnet procesó y generó cambios |
| **Costo por mensaje** | $0.28 | |
| **Costo TOTAL sesión** | **$0.34** | ⚠️ Incluye setup inicial + supervisión exhaustiva |

**⚡ Próximas tareas costarán 50% menos (~$0.12-0.18)** porque:
- Credenciales ya configuradas
- Contexto de Aider cargado
- Flujo optimizado

**✅ Vale la pena porque**:
1. Inicié una sección completamente nueva (setup AWS/Google)
2. Leí 7+ archivos para contexto y supervisión
3. Corregí configuración de Aider (.aider.conf.yml)
4. Documenté el flujo completo para reutilización futura

---

## 🎓 CUÁNDO USAR CADA MODELO

### Deepseek (Rápido, barato)
```bash
aider --model bedrock/deepseek.v3.2 --no-auto-commit
```
- ✅ Agregar comentarios
- ✅ Cambiar nombres de variables
- ✅ Refactoring simple
- ✅ Arreglar typos
- ✅ Cambios CSS/Tailwind

**Haiku dice**: "Usa Deepseek, es rápido y barato"

---

### Llama 3.3 70B (Balance)
```bash
aider --model bedrock/meta.llama3-3-70b-instruct-v1:0 --no-auto-commit
```
- ✅ Cambios medianos en componentes
- ✅ Pequeños endpoints API
- ✅ Lógica no muy compleja
- ✅ Actualizaciones de tipos TypeScript

**Haiku dice**: "Usa Llama, buen balance costo-calidad"

---

### Sonnet 4.6 (Mejor calidad)
```bash
aider --model bedrock/global.anthropic.claude-sonnet-4-6 --no-auto-commit
```
- ✅ Nuevas features complejas
- ✅ Refactoring importante
- ✅ Cambios que afectan múltiples módulos
- ✅ Lógica de negocio compleja
- ✅ Security/validaciones críticas

**Haiku dice**: "Usa Sonnet, esto es importante"

---

## 📝 COMANDOS ÚTILES EN AIDER

```bash
# Ver archivos en contexto
/ls

# Agregar archivos
/add frontend/src/components/
/add backend/src/main/java/KuHub/modules/

# Remover archivos del contexto (para no contaminar)
/drop frontend/src/pages/not-used.tsx

# Buscar en archivos
/search "nombreClase"

# Cambiar modelo en sesión actual
/model bedrock/deepseek.v3.2

# Ver historial
/history

# Limpiar contexto
/clear
```

---

## 🎬 EJEMPLO PRÁCTICO 1: Cambio Simple (Deepseek)

**Usuario**: "Cambia el color del botón primario de #FFB800 a #FF585D"

**Haiku responde**:
```
✅ Es simple, CSS/tailwind. Usamos Deepseek (rápido y barato).

Terminal:
aider --model bedrock/deepseek.v3.2 --no-auto-commit

En Aider:
/add frontend/src/index.css

Sonnet:
"En el archivo tailwind config, cambia el color primary 
de #FFB800 a #FF585D (rojo Gastonomía)"
```

---

## 🎬 EJEMPLO PRÁCTICO 2: Feature Nueva (Sonnet)

**Usuario**: "Quiero un dashboard de ventas diarias con gráficos"

**Haiku responde**:
```
✅ Feature nueva, compleja. Usamos Sonnet (mejor).

Terminal:
aider --model bedrock/global.anthropic.claude-sonnet-4-6 --no-auto-commit

En Aider:
/add frontend/src/pages/
/add frontend/src/components/
/add frontend/src/services/
/add frontend/src/types/
/add backend/src/main/java/KuHub/modules/dashboard/

Sonnet:
"Crea un dashboard de ventas diarias que:
- Muestre gráfico de línea con ventas por día (últimos 30 días)
- KPI: Total ventas, Promedio diario, Top producto
- Filtro por rango de fechas
- Backend: Nuevo endpoint GET /api/v1/dashboard/ventas-diarias
- Frontend: Nueva página dashboard-ventas.tsx
- Use Recharts para gráficos, HeroUI para componentes"
```

---

## ⚡ VENTAJAS DE ESTE SETUP

✅ **Haiku coordina** → Barato, rápido (es local/cached)  
✅ **Sonnet ejecuta** → Preciso, cuando lo necesitas  
✅ **No auto-commits** → Reviso antes de commitar  
✅ **Cambios se reflejan** → Validación automática (TS + Maven)  
✅ **Flexible** → Cambios modelo según complejidad  
✅ **Económico** → 30-40% ahorro vs Sonnet directo  

---

## 📌 NOTAS FINALES

### Si quieres Aider directo (sin Haiku)

Ya está listo. Solo corre:
```bash
aider --model bedrock/global.anthropic.claude-sonnet-4-6 --no-auto-commit --encoding utf-8 --dark-mode
```

### Si quieres que Haiku coordine

1. En Claude Code: "Necesito..." 
2. Haiku lee `secrets.md`
3. Haiku te da instrucciones exactas
4. Tú ejecutas en Aider

### Configuración actualizada

- ✅ `.aider.conf.yml` → Sin auto-commits, con validación automática
- ✅ `aider-post-apply.sh` → Valida cambios (TS + Maven)
- ✅ `secrets.md` → Info para Haiku coordinando
- ✅ `.gitignore` → Protege `secrets.md`
- ✅ `AIDER_CONFIG.md` → Doc de Aider
- ✅ Este archivo → Flujo completo

**Listo para trabajar. 🚀**
