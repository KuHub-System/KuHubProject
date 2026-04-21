# 🤖 Configuración de Aider para KuHub

Esta es la configuración correcta de **Aider** para trabajar en el monorepo KuHub (frontend + backend).

## Problema original

Cuando Aider aplicaba cambios:
- ✅ Los cambios se guardaban en disco
- ❌ No se reflejaban en el IDE o no compilaban correctamente
- ❌ El hot-reload no funcionaba automáticamente

**Causa**: Aider ejecutaba comandos desde la raíz, pero el `package.json` de frontend está en `frontend/` y el `pom.xml` de backend está en `backend/`.

## Solución implementada

Se crearon dos archivos:

### 1. `.aider.conf.yml` (Configuración principal)

```yaml
cmd-after-apply: bash aider-post-apply.sh
```

Este archivo le dice a Aider que ejecute un script bash después de cada cambio.

### 2. `aider-post-apply.sh` (Script de validación)

Valida automáticamente:

- **Frontend**: `npx tsc --noEmit` en `frontend/`
  - Verifica que no haya errores de TypeScript
  
- **Backend**: `mvn clean compile` en `backend/`
  - Verifica que el código Java compila correctamente

El script detecta automáticamente **qué archivos se modificaron** y ejecuta solo la validación necesaria:
- Si cambias algo en `frontend/` → valida TypeScript
- Si cambias algo en `backend/` → compila Maven
- Si cambias ambos → valida ambos

## Cómo usar Aider

### 1. Configura las variables de entorno (ejecutar una sola vez por sesión)

```powershell
# Agregar Aider al PATH
$env:Path += ";C:\Users\Matheus\AppData\Roaming\Python\Python312\Scripts"

# Claves de AWS (para usar Claude vía Bedrock)
$env:AWS_ACCESS_KEY_ID="REDACTED_AWS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY="REDACTED_AWS_SECRET"
$env:AWS_REGION="us-east-1"
```

### 2. Inicia Aider desde la **raíz del proyecto**

```bash
cd /c/Users/Matheus/IdeaProjects/KuHubProject

aider --model bedrock/deepseek.v3.2 --no-auto-commit --encoding utf-8 --dark-mode
```

### 3. Aider ejecutará automáticamente el script después de cada cambio

Ejemplo de flujo:

```
User: "Agrega un comentario en App.tsx"
↓
Aider aplica el cambio
↓
Script ejecuta: npx tsc --noEmit en frontend/
↓
Resultado: ✅ Frontend OK
↓
Cambio está listo para revisar
```

## Qué sucede con cada tipo de cambio

| Cambio | Validación | Resultado |
|--------|-----------|----------|
| `frontend/**/*.tsx` | TypeScript check | ✅ Indica si hay errores TS |
| `backend/**/*.java` | Maven compile | ✅ Indica si hay errores Java |
| `frontend/` + `backend/` | Ambas | ✅ Valida ambas carpetas |
| Archivos de config | Depende del archivo | ✅ Se valida la carpeta relacionada |

## Ventajas de esta configuración

✅ **Automático**: No necesitas ejecutar comandos manualmente  
✅ **Inteligente**: Detecta qué se cambió y valida solo lo necesario  
✅ **Rápido**: El frontend se valida en segundos, backend en 10-20s  
✅ **Visible**: Ves el estado de cada validación en tiempo real  
✅ **Flexible**: Si algo falla, el script muestra exactamente dónde  

## Solución de problemas

### Si el script no ejecuta después de cambios

1. Verifica que estés en la **raíz del proyecto**:
   ```bash
   pwd  # Debería ser: /c/Users/Matheus/IdeaProjects/KuHubProject
   ```

2. Verifica que el script sea ejecutable:
   ```bash
   ls -la aider-post-apply.sh  # Debería tener permisos: -rwxr-xr-x
   ```

3. Intenta ejecutar el script manualmente:
   ```bash
   bash aider-post-apply.sh
   ```

### Si falla la validación de TypeScript en frontend

- Los errores de TypeScript se mostrarán en rojo
- Revisa que el cambio sea sintácticamente correcto
- Algunos errores pueden ser preexistentes en el proyecto

### Si falla la compilación de Maven en backend

- Los errores de compilación Java se mostrarán
- Asegúrate de que Maven está instalado: `mvn --version`
- El primer `mvn compile` es más lento (descarga dependencias)

## Notas importantes

⚠️ **No toques estos archivos**:
- `.aider.conf.yml` — es la configuración global de Aider
- `aider-post-apply.sh` — es el script de validación

⚠️ **El script asume**:
- Git está inicializado en la raíz del proyecto
- Maven está instalado y disponible en PATH
- Node.js y npm están instalados en frontend/
- Estás ejecutando desde la raíz del proyecto KuHub

## Historial de cambios

- **2026-04-21**: Creación inicial de configuración Aider con soporte monorepo
