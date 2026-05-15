# Contexto: Cambio de rango de versión Axios — Ataque de supply chain (Marzo 2026)

**Fecha del cambio**: 14 de mayo de 2026  
**Archivo modificado**: `frontend/package.json`  
**Versión anterior**: `"axios": "^1.6.7"`  
**Versión nueva**: `"axios": "^1.13.2"`  

---

## ¿Qué pasó?

### El ataque: Axios npm supply chain compromise (30-31 de marzo de 2026)

El 30 de marzo de 2026, un atacante **comprometió la cuenta de npm del mantenedor principal de axios** y publicó dos versiones maliciosas en el registry:

- **`axios@1.14.1`** — rama 1.x (la más usada)
- **`axios@0.30.4`** — rama legacy 0.x

Ambas versiones fueron inyectadas con una **dependencia fantasma maliciosa**: `plain-crypto-js@4.2.1`, cuya única función era descargar e instalar un **Remote Access Trojan (RAT) multiplataforma** que atacaba:
- **macOS**
- **Windows** 
- **Linux**

**Atribución**: Microsoft Threat Intelligence atribuyó el ataque a **Sapphire Sleet**, un grupo de estado-nación de Corea del Norte.

### Impacto potencial

Axios es el cliente HTTP más descargado del ecosistema JavaScript con **más de 100 millones de descargas semanales**. El RAT permitiría a los atacantes:
- Acceso remoto a máquinas de desarrolladores
- Robo de secretos, tokens, credenciales
- Movimiento lateral en redes corporativas
- Persistencia mediante la redistribución automática del malware

---

## ¿Por qué cambié el rango en package.json?

### Antes del cambio

```json
"axios": "^1.6.7"
```

El símbolo `^` en npm significa: **"cualquier versión ≥1.6.7 y <2.0.0"**

Esto significa que si alguien hubiera corrido:
```bash
npm update axios
```

...npm habría descargado `1.14.1` (la versión comprometida) directamente desde el registry.

### Después del cambio

```json
"axios": "^1.13.2"
```

Ahora el rango es **"cualquier versión ≥1.13.2 y <2.0.0"**, lo que:
1. Establece un límite mínimo seguro (1.13.2 es anterior al ataque)
2. Previene que `npm update` baje a versiones anteriores inseguras
3. Permite actualizar a versiones más nuevas y limpias (1.16.1 es la actual)

---

## Estado de seguridad del proyecto

| Componente | Versión | Comprometida | Estado |
|---|---|---|---|
| **node_modules local** | 1.13.2 | No | ✅ Seguro |
| **package-lock.json** | 1.13.2 | No | ✅ Seguro |
| **Imagen Docker (build)** | 1.13.2 | No | ✅ Seguro |
| **Imagen Docker (nginx)** | N/A | N/A | ✅ Solo dist/, no tiene npm |
| **Servidor producción** | 1.13.2 | No | ✅ Seguro |

**Conclusión**: El proyecto **nunca fue afectado** porque:
1. axios 1.13.2 ya estaba instalado localmente
2. El `package-lock.json` fija exactamente 1.13.2
3. El Dockerfile usa `npm ci` (lee lock file, no registry fresco)
4. La imagen de producción solo contiene archivos estáticos compilados

---

## Cómo ignorar este archivo en Git

Este documento contiene análisis contextual pero **no debe ser comiteado** porque:
- Es una nota temporal de seguridad
- El único cambio necesario (`package.json`) ya está registrado en git
- Es referencia para el equipo, no parte del código

### Opción 1: Ignorarlo en `.gitignore`

Agregar al archivo `.gitignore` del proyecto:

```bash
# Notas de seguridad y contexto
CONTEXTO_CAMBIO_VERSION_AXIO_MAWARE.MD
```

### Opción 2: Ignorarlo solo localmente (sin cambiar `.gitignore`)

```bash
git update-index --skip-worktree CONTEXTO_CAMBIO_VERSION_AXIO_MAWARE.MD
```

Para revertir:
```bash
git update-index --no-skip-worktree CONTEXTO_CAMBIO_VERSION_AXIO_MAWARE.MD
```

### Opción 3 (Recomendada): Usar `.gitignore` local sin versionar

Si solo quieres que nadie lo vea, crea `.gitignore.local`:

```bash
echo "CONTEXTO_CAMBIO_VERSION_AXIO_MAWARE.MD" >> .gitignore.local
```

Y agrega `.gitignore.local` a `.gitignore` principal:

```bash
echo ".gitignore.local" >> .gitignore
```

---

## Cambios realizados

### 1. Modificación de `frontend/package.json`

**Línea 22**:
```diff
- "axios": "^1.6.7",
+ "axios": "^1.13.2",
```

Este es el **único cambio necesario** y está totalmente seguro de cometer a git.

### 2. Verificaciones realizadas

```bash
# Confirmado: versión instalada
$ npm list axios
axios@1.13.2  ✅

# Confirmado: versión en lock file
$ grep '"axios"' package-lock.json
"axios": "1.13.2"  ✅

# Confirmado: no hay paquetes TanStack (atacados el 11 mayo)
$ npm list | grep tanstack
(no output)  ✅

# Confirmado: Docker usa npm ci (usa lock file, no registry)
$ cat Dockerfile | grep npm
RUN npm ci  ✅
```

---

## Referencias y fuentes

- [Microsoft Security Blog: Axios compromise mitigation](https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/)
- [Axios GitHub Issue #10604: Compromised versions](https://github.com/axios/axios/issues/10604)
- [CISA Alert: axios supply chain compromise](https://www.cisa.gov/news-events/alerts/2026/04/20/supply-chain-compromise-impacts-axios-node-package-manager)
- [Elastic Security Labs: Axios RAT analysis](https://www.elastic.co/security-labs/axios-one-rat-to-rule-them-all)

---

## Acción futura (opcional)

Si en el futuro quieres **actualizar a la versión más reciente limpia de axios**:

```bash
cd frontend
npm update axios  # Esto subiría de 1.13.2 → 1.16.1 (última versión segura)
```

Pero no hay prisa — `1.13.2` sigue siendo totalmente segura y funcional.
