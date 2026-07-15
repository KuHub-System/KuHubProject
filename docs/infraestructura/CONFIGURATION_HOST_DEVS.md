# CONFIGURATION_HOST_DEVS.md — Infraestructura y Configuración de KuHub

**Fecha:** 2026-04-21  
**Entorno:** Pruebas académicas — AWS Lightsail (Virginia, Zona A)  
**Dominio:** `appkuhub.questweb.cl`  
**Responsable:** Alumno desarrollador

---

## 1. Resumen Ejecutivo

KuHub es un **sistema de gestión gastronómica** desplegado en **AWS Lightsail** con arquitectura distribuida:

- **Servidor de Aplicación** (Frontend + Backend): IP pública `52.5.222.79` — 2 GB RAM, 2 vCPU, 60 GB SSD
- **Servidor de Base de Datos**: IP pública `13.218.253.211` — 512 MB RAM, 2 vCPU, 20 GB SSD
- **Conexión privada**: VPC Peering `172.26.12.228` (ancho de banda sin metraje, sin latencia)
- **Protocolo**: HTTPS con certificado Let's Encrypt válido (reconocido por todos los navegadores)
- **Acceso**: `https://appkuhub.questweb.cl/login`

---

## 2. Topología de Infraestructura

```
┌─────────────────────────────────────────────────────────────┐
│  AWS Lightsail — Instancia A (Aplicación)                   │
│  IP Pública: 52.5.222.79 — Virginia — Zona A                │
│  Recursos: 2 GB RAM, 2 vCPU, 60 GB SSD                      │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HOST OS: Ubuntu 20.04 LTS                             │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ NGINX (Reverse Proxy - Puerto :80 y :443)       │   │ │
│  │  │                                                 │   │ │
│  │  │ • SSL/TLS: Let's Encrypt (fullchain.pem)        │   │ │
│  │  │ • Redirige HTTP → HTTPS                         │   │ │
│  │  │ • Proxy a localhost:3000 (frontend)             │   │ │
│  │  │ • Headers X-Forwarded-* para CORS               │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │            ↓                                           │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ Docker Network (kuhub-app)                      │   │ │
│  │  │                                                 │   │ │
│  │  │ Container 1: kuhub-frontend                     │   │ │
│  │  │   • Imagen: martorias/kuhub-app:frontend-*      │   │ │
│  │  │   • Puerto: 127.0.0.1:3000:80 (interno)         │   │ │
│  │  │   • NGINX dentro del container                  │   │ │
│  │  │   • Proxy /api/* → backend:8080                 │   │ │
│  │  │   • Límite RAM: 200 MB                          │   │ │
│  │  │                                                 │   │ │
│  │  │ Container 2: kuhub-backend (Spring Boot)        │   │ │
│  │  │   • Imagen: martorias/kuhub-app:backend-*       │   │ │
│  │  │   • Puerto: 127.0.0.1:8080 (interno)            │   │ │
│  │  │   • Spring Security + JWT auth                  │   │ │
│  │  │   • Límite RAM: 1024 MB (1 GB)                  │   │ │
│  │  │   • JVM Heap: -Xmx1024m -Xms768m                │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │  Estado: Activo ✓                                      │ │
│  │  Uptime: Contenedores con restart: always              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                    [VPC Peering]
                   172.26.12.228
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  AWS Lightsail — Instancia B (Base de Datos)                │
│  IP Pública: 13.218.253.211 — Virginia — Zona A             │
│  Recursos: 512 MB RAM, 2 vCPU, 20 GB SSD                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HOST OS: Ubuntu 24.04 LTS                             │ │
│  │                                                        │ │
│  │  Sistema de Archivos y Memoria:                        │ │
│  │  • RAM Total: 414 MB                                   │ │
│  │  • RAM Usada: ~232 MB                                  │ │
│  │  • RAM Disponible: 181 MB                              │ │
│  │  • Swap Total: 1.5 GB                                  │ │
│  │  • Swap Usado: 41 MB                                   │ │
│  │  • SSD: 20 GB (partición principal)                    │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ PostgreSQL 16.13                                │   │ │
│  │  │ • Database: kuhub_devs                          │   │ │
│  │  │ • Usuario: kuhub_devs                           │   │ │
│  │  │ • Puerto: 5432 (escucha en *)                   │   │ │
│  │  │ • shared_buffers: 128 MB                        │   │ │
│  │  │ • max_connections: 100                          │   │ │
│  │  │ • Hostname Privado: 172.26.12.228 (VPC)         │   │ │
│  │  │ • Hostname Externo: 13.218.253.211 (SSH/pgA)    │   │ │
│  │  │ • Acceso: VPC Peering desde Instancia A         │   │ │
│  │  │ • Configurado con pgcrypto para hashes          │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │  Estado: Activo ✓                                      │ │
│  │  Backups: Configurados en AWS Lightsail Management     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Distribución de Memoria

### Instancia A (Aplicación) — 2 GB RAM

| Componente | Límite Asignado | Estado |
|---|---|---|
| **Docker Frontend** | 200 MB | Activo |
| **Docker Backend** | 1024 MB (1 GB) | Activo |
| **JVM Heap (Backend)** | -Xmx1024m / -Xms768m | Configurado |
| **Sistema Operativo & nginx** | ~600 MB | Dinámico |
| **TOTAL DISPONIBLE** | 2 GB | ✓ |

### Instancia B (Base de Datos) — 512 MB RAM + 1.5 GB Swap

| Componente | Límite | Estado |
|---|---|---|
| **PostgreSQL** | ~100-150 MB | Activo |
| **Sistema Operativo** | ~100 MB | Dinámico |
| **Caché de Disco (buff/cache)** | 190 MB | Sistema |
| **Swap (virtual)** | 1.5 GB | Activo |
| **Disponible Inmediato** | 181 MB | Dinámico |

⚠️ **Nota:** La Instancia B utiliza **Swap virtual** como amortiguador. PostgreSQL está optimizado para bajo overhead en memoria.

---

## 4. Certificación SSL/TLS — HTTPS

### Estado Actual

| Parámetro | Valor |
|---|---|
| **Autoridad Certificadora** | Let's Encrypt (ISRG Root X1) — Reconocida mundialmente ✓ |
| **Tipo de Certificado** | DV (Domain Validated) |
| **Dominio** | `appkuhub.questweb.cl` |
| **Válido Desde** | 2026-04-11 |
| **Vencimiento** | 2026-07-09 (90 días, estándar Let's Encrypt) |
| **Renovación** | Automática cada 60 días (Certbot + systemd timer) |

### Ubicación en el Servidor (Instancia A)

```
/etc/letsencrypt/live/appkuhub.questweb.cl/
├── fullchain.pem          ← Certificado + cadena de CA
├── privkey.pem            ← Clave privada (NO compartir)
├── cert.pem               ← Certificado solo
└── chain.pem              ← Cadena de autoridades
```

### Configuración NGINX

```nginx
server {
    listen 80;
    server_name appkuhub.questweb.cl;
    return 301 https://$host$request_uri;  # Redirige HTTP → HTTPS
}

server {
    listen 443 ssl http2;
    server_name appkuhub.questweb.cl;

    # Certificados Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/appkuhub.questweb.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/appkuhub.questweb.cl/privkey.pem;

    # Protocolos seguros
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy a frontend (localhost:3000)
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

### Renovación Automática

```bash
# Verificar estado del timer
sudo systemctl status snap.certbot.renew.timer

# Probar renovación (dry-run)
sudo certbot renew --dry-run

# Logs
sudo journalctl -u snap.certbot.renew.service
```

---

## 5. Configuración de CORS y Headers

### CORS en Spring Security (Backend)

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
   http.cors(cors -> cors.configurationSource(request -> {
      CorsConfiguration config = new CorsConfiguration();
      config.setAllowedOrigins(Arrays.asList(
              "https://appkuhub.questweb.cl",          // Pruebas HTTPS
              "https://web-kuhub.questweb.cl",         // Producción HTTPS (en configuración)
              "https://www.web-kuhub.questweb.cl",     // Producción www
              "http://localhost:3000",                  // Desarrollo local
              "http://localhost:5173"                   // Vite dev server
      ));
      config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
      config.setAllowedHeaders(Arrays.asList("*"));
      config.setAllowCredentials(true);
      config.setMaxAge(3600L);
      return config;
   }));
   // ... resto de configuración
   return http.build();
}
```

**Explicación:**
- `https://appkuhub.questweb.cl` — Entorno de pruebas (HTTPS válido con Let's Encrypt)
- `https://web-kuhub.questweb.cl` — Producción (HTTPS pendiente — SSL en configuración)
- `https://www.web-kuhub.questweb.cl` — Producción con www (mismo servidor, misma IP)
- `http://localhost:*` — Desarrollo local (protocolo inseguro permitido solo en dev)
- Los headers `X-Forwarded-*` en nginx preservan la información de origen para que Spring vea la IP correcta

### Headers de Seguridad en NGINX

```nginx
# En el bloque server {} HTTPS

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 6. Flujo de Autenticación

```
┌─────────────────────────────────────────┐
│ Usuario en Browser                      │
│ https://appkuhub.questweb.cl/login      │
└──────────────┬──────────────────────────┘
               │ POST /api/v1/auth/login
               │ email: ejemple@kuhub.cl
               │ contrasena: user123
               ↓
┌─────────────────────────────────────────┐
│ NGINX (Proxy reverso) — :443 HTTPS      │
│ • Desencripta TLS                       │
│ • Valida headers CORS                   │
│ • Agrega X-Forwarded-* headers          │
│ • Proxy → 127.0.0.1:3000                │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ Frontend NGINX (en Docker)              │
│ • Recibe en :80 (interno del container) │
│ • Proxy /api/* → backend:8080           │
│ • BUG FIXES:                            │
│   - proxy_pass: $backend (sin /api/)    │
│   - Resolver: 127.0.0.11 (DNS Docker)   │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ Backend Spring Boot — :8080             │
│                                         │
│ JwtAuthenticationFilter:                │
│ • Lee email + contrasena del JSON body  │
│ • Busca usuario en BD por email         │
│ • Valida contraseña (BCryptPasswordEn-  │
│   coder, hash $2a$ generado con Python) │
│ • Si OK → Genera JWT token              │
│ • Retorna: { token, user }              │
└──────────────┬──────────────────────────┘
               │ Response 200 + JWT
               ↓
┌─────────────────────────────────────────┐
│ Frontend guarda JWT en localStorage     │
│ Futuras peticiones envían:              │
│   Authorization: Bearer <JWT>           │
└─────────────────────────────────────────┘
```

### Hashes de Contraseña

**Formato:** BCrypt con prefijo `$2a$` (compatibilidad Spring Security)

**Algoritmo de generación:**

```python
import bcrypt
password = "admin123"
hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
# Resultado: $2a$10$xxxxx... (42 caracteres)
```

**Usuarios actualizados (2026-04-21):**

| Email | Hash | Estado |
|---|---|---|
| dmorales@duoc.cl | $2a$10$... | ✓ Validado |
| adminhash@kuhub.cl | $2a$10$... | ✓ Validado |
| Otros 7 usuarios | $2a$10$... | ✓ Validados |

---

## 7. Cambios Realizados en este Ciclo (2026-04-21)

### 7.1 Fix: Configuración NGINX Proxy (CRÍTICO)

**Problema:** Nginx proxy_pass con variable estaba creando ruta duplicada `/api//api/v1/auth/login`

**Root Cause:**
- Cuando se usa variable en `proxy_pass` (ej: `$backend`), Nginx **no reescribe la URI**
- Si proxy_pass es `$backend/api/`, Nginx concatena: `/api/` + `/api/v1/auth/login` = `/api//api/v1/auth/login`
- Spring Security's JwtAuthenticationFilter solo coincide con `/api/v1/auth/login` exactamente
- **Resultado:** Login retornaba 404 (no encontrado) o 401 (no autorizado)

**Solución:**

```nginx
# ANTES (incorrecto)
set $backend http://backend:8080;
location /api/ {
    proxy_pass $backend;  # ← Sin barra de cierre, pero igual suma /api/
}

# DESPUÉS (correcto)
set $backend http://backend:8080;
location / {
    proxy_pass $backend;  # ← Solo backend:8080, URI pasa sin modificación
}
```

**Verificación:**
```bash
# Dentro del contenedor frontend
curl -sv http://backend:8080/api/v1/auth/login -d '{"email":"test@test.com","contrasena":"test"}'
# → Response 200 (correcto)
```

### 7.2 Actualización: application.properties (Backend)

```properties
# ANTES
spring.jpa.hibernate.ddl-auto=update  # ← Intentaba modificar esquema

# DESPUÉS
spring.jpa.hibernate.ddl-auto=none    # ← Schema ya existe, Hibernate solo lee
```

**Justificación:** La BD ya tiene datos migrados. Hibernate no debe tocar la estructura.

### 7.3 Actualización: docker-compose.yml (Aplicación)

```yaml
# Frontend
frontend:
   ports:
      - "127.0.0.1:3000:80"  # ← Solo localhost, no expone puerto en host
   deploy:
      resources:
         limits:
            memory: 200M
         reservations:
            memory: 100M

# Backend
backend:
   ports:
      - "8080:8080"
   environment:
      - LOGGING_LEVEL_ORG_HIBERNATE_SQL=DEBUG
      - LOGGING_LEVEL_ORG_HIBERNATE_ORM_JDBC_BIND=TRACE
   deploy:
      resources:
         limits:
            memory: 1400M
         reservations:
            memory: 1024M
```

**Cambios:**
- Agregados logging de Hibernate para depuración
- Frontend limitado a puerto local (evita conflicto con nginx en host)
- Backend limita RAM a 1.4 GB (1 GB nominal + buffer)

---

## 8. Base de Datos — PostgreSQL

### Versión y Configuración

| Parámetro | Valor |
|---|---|
| **PostgreSQL** | 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) |
| **Puerto** | `5432` |
| **shared_buffers** | 128 MB |
| **max_connections** | 100 |
| **listen_addresses** | `*` (Escucha en todas las interfaces) |

### Conexión

| Parámetro | Valor |
|---|---|
| **Host (Externo)** | `13.218.253.211` (Solo para SSH y pgAdmin) |
| **Host (Privado)** | `172.26.12.228` (VPC Peering — **Usar siempre en Backend**) |
| **Puerto** | `5432` |
| **Database** | `kuhub_devs` |
| **Usuario** | `kuhub_devs` |
| **Contraseña** | Almacenada en CI/CD secrets (variables de entorno) |

### String de conexión (Backend)

```properties
# IMPORTANTE: Desde instancia A (Docker), SIEMPRE usar dirección privada (menor latencia, sin metraje)
spring.datasource.url=jdbc:postgresql://172.26.12.228:5432/kuhub_devs
spring.datasource.username=kuhub_devs
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
```

### Extensiones PostgreSQL

```sql
-- Instalada: pgcrypto (para crypt() y hashes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

### Backup y Recuperación

```bash
# Backup local (en instancia B)
pg_dump -U kuhub_devs kuhub_devs > kuhub_backup_$(date +%Y%m%d).sql

# Backup remoto (desde instancia A, usa host privado)
pg_dump -h 172.26.12.228 -U kuhub_devs kuhub_devs > kuhub_backup.sql

# Restauración (desde instancia A)
psql -h 172.26.12.228 -U kuhub_devs kuhub_devs < kuhub_backup.sql
```

---

## 9. Deployment y CI/CD

### Git Workflow

```bash
# 1. Cambios y commits locales
git add .
git commit -m "mensaje descriptivo"
git push origin rama

# 2. Crear tag con versión (una por día)
git tag K1.0.X  # Ej: K1.0.8, K1.0.9

# 3. Push de tag (dispara GitHub Actions)
git push origin K1.0.X
```

### GitHub Actions — Build & Push Docker

**Trigger:** `git push origin K1.0.X` (push de tag)

**Proceso:**
1. Checkout del código en tag específico
2. Build de imagen Docker (frontend + backend)
3. Push a Docker Hub (`martorias/kuhub-app:frontend-K1.0.X`, `:backend-K1.0.X`)
4. SSH a instancia A
5. `docker-compose pull && docker-compose up -d` (red despliega nuevos containers)

### Versionado (Obligatorio en cada deploy)

**Archivos a actualizar antes de crear tag:**

| Archivo | Línea | Cambio |
|---|---|---|
| `frontend/src/layouts/auth-layout.tsx` | Footer copyright | Cambiar `v1.0.X` a nueva versión |
| `frontend/src/components/footer.tsx` | Footer copyright | Cambiar `v1.0.X` a nueva versión |

**Ejemplo:**
```tsx
// Si el tag es K1.0.9, ambas líneas deben decir:
© {new Date().getFullYear()} KuHub · Entorno de Pruebas | v1.0.9
```

---

## 10. Acceso SSH a Instancias

### Instancia A — Aplicación (52.5.222.79)

```bash
ssh -i /ruta/a/key.pem ubuntu@52.5.222.79

# Dentro del servidor
docker ps                              # Ver containers activos
docker logs -f kuhub-frontend          # Logs del frontend
docker logs -f kuhub-backend           # Logs del backend
sudo systemctl status nginx            # Estado del nginx host
sudo tail -f /var/log/nginx/access.log # Tráfico web
```

### Instancia B — Base de Datos (13.218.253.211)

```bash
ssh -i /ruta/a/key.pem ubuntu@13.218.253.211

# Dentro del servidor (usar host privado 172.26.12.228 desde instancia A)
psql -h 172.26.12.228 -U kuhub_devs kuhub_devs  # Conectar a BD (desde instancia A)
\dt                                              # Listar tablas
\l                                               # Listar bases de datos

# Verificar memoria
free -h                                # Estado de RAM y Swap
df -h                                  # Uso de disco

# Verificar configuración PostgreSQL
psql -U kuhub_devs kuhub_devs -c "SHOW listen_addresses;"
psql -U kuhub_devs kuhub_devs -c "SHOW shared_buffers;"
psql -U kuhub_devs kuhub_devs -c "SHOW max_connections;"
```

---

## 11. Troubleshooting

### Error: "ERR_CONNECTION_REFUSED" en HTTPS

**Síntomas:** `https://appkuhub.questweb.cl/login` no abre

**Causas comunes:**

1. **nginx host está apagado**
   ```bash
   sudo systemctl status nginx
   sudo systemctl start nginx
   ```

2. **Contenedores Docker no corren**
   ```bash
   docker ps  # Ver si están activos
   docker-compose up -d  # Reiniciar
   ```

3. **Certificado Let's Encrypt expiró**
   ```bash
   sudo certbot renew --force-renewal
   sudo systemctl reload nginx
   ```

### Error: Login 401 "Bad credentials"

**Causas comunes:**

1. **Hash de contraseña incompatible**
   - Regenerar con Python `bcrypt` library con prefijo `$2a$`

2. **Proxy duplicando ruta /api//**
   - Verificar `proxy_pass` en nginx (debe ser `$backend` sin `/api/`)

3. **CORS rechazado**
   - Verificar headers `X-Forwarded-*` en nginx
   - Revisar allowedOrigins en SpringSecurityConfig

### Bajo Rendimiento

**En Instancia A (Aplicación):**
```bash
top -p $(docker inspect -f '{{.State.Pid}}' kuhub-backend)  # CPU/RAM del backend
```

**En Instancia B (Base de Datos):**
```bash
# Ver consultas lentas (conectar desde instancia A usando host privado)
psql -h 172.26.12.228 -U kuhub_devs kuhub_devs -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# O iniciar sesión interactiva
psql -h 172.26.12.228 -U kuhub_devs kuhub_devs
\x  # Expandir salida
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;
```

---

## 12. Documentación de Referencia

| Documento | Ubicación | Contenido |
|---|---|---|
| **CONVENTIONS.md** (Global) | `/KuHubProject/CONVENTIONS.md` | Convenciones de versionado y deploy |
| **CONVENTIONS.md** (Backend) | `/backend/CONVENTIONS.md` | Estructura de código, módulos, DTOs |
| **CONVENTIONS.md** (Frontend) | `/frontend/CONVENTIONS.md` | Tech stack, componentes, hooks |
| **nota_alcance** | `/KuHubProject/nota_alcance.md` | Alcance funcional del proyecto |

---

## 13. Checklist de Operaciones Comunes

### Antes de Hacer Deploy

- [ ] Cambiar versión en `auth-layout.tsx` y `footer.tsx`
- [ ] Commitear cambios: `git add . && git commit -m "..."`
- [ ] Push a rama principal: `git push origin main` (o rama actual)
- [ ] Crear tag: `git tag K1.0.X`
- [ ] Push de tag: `git push origin K1.0.X`
- [ ] Esperar a GitHub Actions (5-10 minutos)
- [ ] Verificar en `https://appkuhub.questweb.cl/login`

### Después de Deploy (Validación)

- [ ] Navegar a `https://appkuhub.questweb.cl/login`
- [ ] Ingresar con credenciales válidas (ej: `dmorales@duoc.cl` / `admin123`)
- [ ] Verificar que el frontend se carga correctamente
- [ ] Revisar logs en servidor: `docker logs kuhub-backend | head -50`
- [ ] Probar endpoints críticos (inventario, pedidos)

### Emergencias

| Problema | Comando |
|---|---|
| Reiniciar Docker | `docker-compose restart` |
| Ver logs del backend | `docker logs -f kuhub-backend` |
| Conectar a BD directamente | `psql -h 172.26.12.228 -U kuhub_devs kuhub_devs` |
| Recargar certificado SSL | `sudo certbot renew && sudo systemctl reload nginx` |

---

## 14. Seguridad y Buenas Prácticas

### ✓ Lo que está bien implementado

- HTTPS con certificado reconocido (Let's Encrypt)
- Contenedores Docker exponen solo localhost, no acceso directo de Internet
- Autenticación JWT con tokens firmados
- Contraseñas hasheadas con BCrypt (no reversibles)
- CORS configurado solo para dominios conocidos
- Base de datos en instancia separada (no en el mismo servidor)
- VPC Peering para comunicación privada (sin salir al Internet)

### ⚠️ Mejoras futuras (no críticas para desarrollo)

- Implementar HSTS headers (ya hay, pero reforzar)
- Rate limiting en endpoints de login
- WAF (Web Application Firewall) en AWS
- Secrets Manager para credenciales (en lugar de env vars en docker-compose)
- Monitoring y alertas (CloudWatch)
- CDN para assets estáticos (CloudFront)

---

## 15. Contacto y Responsabilidad

| Rol | Responsable |
|---|---|
| Desarrollo | Alumno desarrollador |
| Infraestructura AWS | Alumno desarrollador |
| Supervisión | Docente evaluador |
| Cliente final | DuocUC (proyecto académico) |

**Última actualización:** 2026-04-21 — Nginx fix + SSL validation  
**Próxima revisión recomendada:** 2026-05-21 (renovación de certificado Let's Encrypt)

---

*Este documento es la fuente central de verdad para la configuración de KuHub en desarrollo y debe mantenerse actualizado con cada cambio significativo en infraestructura.*
