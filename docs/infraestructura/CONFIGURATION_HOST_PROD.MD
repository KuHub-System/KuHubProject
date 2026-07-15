# CONFIGURATION_HOST_PROD.MD — Infraestructura y Configuración de KuHub Producción

**Fecha:** 2026-06-28
**Entorno:** Producción — AWS Lightsail (Virginia, Zona A)
**Dominio:** `web-kuhub.questweb.cl` (SSL pendiente de activación)
**Responsable:** Alumno desarrollador

---

## 1. Resumen Ejecutivo

KuHub producción es un **sistema de gestión gastronómica** desplegado en **AWS Lightsail** con arquitectura de servidor único optimizada:

- **Servidor único** (Frontend + Backend + Base de Datos): IP pública `18.209.52.224` — 4 GB RAM, 2 vCPU, 80 GB SSD
- **Base de Datos**: PostgreSQL 17 **nativo en el host** (sin Docker) — máxima eficiencia de I/O
- **Comunicación interna**: Backend Docker → PostgreSQL via `host.docker.internal` (bridge gateway)
- **Protocolo actual**: HTTP puerto 80 (HTTPS pendiente — certificado aún en configuración)
- **Acceso actual**: `http://18.209.52.224` (temporal hasta activar SSL)
- **Acceso futuro**: `https://web-kuhub.questweb.cl` / `https://www.web-kuhub.questweb.cl`

### Diferencia clave vs Entorno de Pruebas

| | Pruebas (`K*.*.*`) | Producción (`PK*.*.*`) |
|---|---|---|
| Servidores | 2 (App + BD separada) | 1 (todo en uno) |
| BD | PostgreSQL 16 en instancia separada | PostgreSQL 17 nativo en el host |
| RAM disponible | 2 GB | 4 GB |
| JVM Backend | -Xmx1024m / -Xms768m | -Xmx2048m / -Xms1536m |
| Frontend puerto | 127.0.0.1:3000 (detrás de Nginx host) | 0.0.0.0:80 (directo) |
| SSL | Let's Encrypt activo | Pendiente (al vincular subdominio) |

---

## 2. Topología de Infraestructura

```
Internet
    │
    │ :80 (HTTP)  →  :443 (HTTPS — pendiente)
    ↓
┌─────────────────────────────────────────────────────────────┐
│  AWS Lightsail — Instancia Producción                       │
│  IP Pública: 18.209.52.224 — Virginia — Zona A              │
│  Recursos: 4 GB RAM, 2 vCPU, 80 GB SSD                      │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HOST OS: Ubuntu 24.04 LTS                             │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ PostgreSQL 17.10 (NATIVO — sin Docker)          │   │ │
│  │  │ • Database: kuhub_prod_db                       │   │ │
│  │  │ • Usuario: kuhub_prod                           │   │ │
│  │  │ • Puerto: 5432                                  │   │ │
│  │  │ • listen_addresses: *                           │   │ │
│  │  │ • pg_hba: 172.17.0.0/16 y 172.18.0.0/16        │   │ │
│  │  │   (redes Docker bridge — scram-sha-256)         │   │ │
│  │  │ • Acceso desde contenedores: host.docker.internal│   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │              ↑  host.docker.internal:5432              │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ Docker Network (bridge)                         │   │ │
│  │  │                                                 │   │ │
│  │  │ Container 1: kuhub-frontend                     │   │ │
│  │  │   • Imagen: martorias/kuhub-app:frontend-PK*    │   │ │
│  │  │   • Puerto: 0.0.0.0:80->80 (expuesto al mundo)  │   │ │
│  │  │   • Nginx dentro del container                  │   │ │
│  │  │   • Proxy /api/* → backend:8080 (red interna)   │   │ │
│  │  │   • Límite RAM: 256 MB                          │   │ │
│  │  │                                                 │   │ │
│  │  │ Container 2: kuhub-backend (Spring Boot)        │   │ │
│  │  │   • Imagen: martorias/kuhub-app:backend-PK*     │   │ │
│  │  │   • Puerto: 8080 (solo red interna Docker)      │   │ │
│  │  │   • Spring Security + JWT + Refresh Token       │   │ │
│  │  │   • Límite RAM: 2800 MB                         │   │ │
│  │  │   • JVM: -Xmx2048m -Xms1536m                   │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │  Estado: Activo ✓                                      │ │
│  │  Uptime: restart: always                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Distribución de Memoria — Instancia Producción (4 GB RAM)

| Componente | Límite Asignado | Estado |
|---|---|---|
| **Docker Frontend (Nginx)** | 256 MB | Activo |
| **Docker Backend (Spring Boot)** | 2800 MB | Activo |
| **JVM Heap (Backend)** | -Xmx2048m / -Xms1536m | Configurado |
| **PostgreSQL 17 (nativo)** | ~300 MB (shared_buffers: 128 MB) | Activo |
| **Sistema Operativo + Docker daemon** | ~600 MB | Dinámico |
| **TOTAL DISPONIBLE** | 4 GB | ✓ |

---

## 4. Base de Datos — PostgreSQL 17

### Versión y Configuración

| Parámetro | Valor |
|---|---|
| **PostgreSQL** | 17.10 (Ubuntu 17.10-1.pgdg24.04+1) |
| **Puerto** | `5432` |
| **shared_buffers** | 128 MB (defecto) |
| **max_connections** | 100 |
| **listen_addresses** | `*` |
| **Autenticación Docker** | scram-sha-256 desde 172.17.0.0/16 |

### Conexión

| Parámetro | Valor |
|---|---|
| **Host (desde Docker)** | `host.docker.internal` (gateway bridge → 172.17.0.1) |
| **Host (desde host OS)** | `127.0.0.1` |
| **Puerto** | `5432` |
| **Database** | `kuhub_prod_db` |
| **Usuario** | `kuhub_prod` |
| **Contraseña** | Almacenada en `.env` del servidor y CI/CD secrets |

### String de conexión (Backend — docker-compose.prod.yml)

```yaml
SPRING_DATASOURCE_URL: jdbc:postgresql://host.docker.internal:5432/kuhub_prod_db
SPRING_DATASOURCE_USERNAME: ${KUHUB_BD_USER_PROD}
SPRING_DATASOURCE_PASSWORD: ${KUHUB_BD_USER_PASS}
```

### Backup

```bash
# Conectar desde el servidor (host OS)
PGPASSWORD='<pass>' psql -h 127.0.0.1 -U kuhub_prod -d kuhub_prod_db

# Backup
pg_dump -h 127.0.0.1 -U kuhub_prod kuhub_prod_db > kuhub_prod_backup_$(date +%Y%m%d).sql

# Restauración
psql -h 127.0.0.1 -U kuhub_prod kuhub_prod_db < kuhub_prod_backup.sql
```

---

## 5. SSL/TLS — HTTPS (En configuración)

**Subdominios definidos:**
- `web-kuhub.questweb.cl` → IP estática `18.209.52.224`
- `www.web-kuhub.questweb.cl` → IP estática `18.209.52.224`

**Estado:** Configuración HTTPS en curso. Aún sin certificado activo. CORS ya actualizado en `SpringSecurityConfig.java`.

La arquitectura es diferente al entorno de pruebas: el certificado vive dentro del container frontend (no en un Nginx del host).

### Plan de implementación SSL

**1. Instalar Certbot en el host:**
```bash
sudo apt install certbot
```

**2. Obtener certificado (modo standalone — detener frontend temporalmente):**
```bash
docker stop kuhub-frontend
sudo certbot certonly --standalone -d web-kuhub.questweb.cl -d www.web-kuhub.questweb.cl
docker start kuhub-frontend
```

**3. Actualizar `nginx.conf` del frontend en el repo:**
```nginx
server {
    listen 80;
    server_name web-kuhub.questweb.cl www.web-kuhub.questweb.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name web-kuhub.questweb.cl www.web-kuhub.questweb.cl;

    ssl_certificate     /etc/letsencrypt/live/web-kuhub.questweb.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/web-kuhub.questweb.cl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass         http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
        client_max_body_size 50M;
    }

    location / {
        root      /usr/share/nginx/html;
        index     index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**4. Montar certs como volumen en `docker-compose.prod.yml`:**
```yaml
frontend:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
  ports:
    - "80:80"
    - "443:443"
```

**5. Abrir puerto 443 en Lightsail** — ya está abierto en el firewall.

**6. CORS ya actualizado en `SpringSecurityConfig.java`:**
```java
// ✅ Ya agregado — ambos subdominios habilitados
"https://web-kuhub.questweb.cl",
"http://web-kuhub.questweb.cl",
"https://www.web-kuhub.questweb.cl",
"http://www.web-kuhub.questweb.cl"
```

**7. Deploy con nuevo tag `PK*.*.*`.**

**8. Configurar renovación automática:**
```bash
sudo systemctl enable snap.certbot.renew.timer
sudo certbot renew --dry-run   # Verificar dry-run antes de activar
```

---

## 6. Deployment y CI/CD

### Git Workflow (Producción)

```bash
# 1. Cambios y commits
git add <archivos>
git commit -m "descripcion del cambio"
git push

# 2. Borrar tag anterior si existe
git tag -d PK0.0.X
git push origin --delete PK0.0.X

# 3. Crear nuevo tag (formato PK)
git tag PK0.0.X

# 4. Push del tag (dispara GitHub Actions deploy-prod.yml)
git push origin PK0.0.X
```

### GitHub Actions — deploy-prod.yml

**Trigger:** push de tag `PK*.*.*`

**Proceso:**
1. Checkout del código en el tag específico
2. Build de imagen backend → push a `martorias/kuhub-app:backend-PK*`
3. Build de imagen frontend → push a `martorias/kuhub-app:frontend-PK*`
4. SCP de `docker-compose.prod.yml` al servidor
5. SSH → `docker compose -f docker-compose.prod.yml down`
6. Limpieza de imágenes antiguas
7. `docker compose -f docker-compose.prod.yml pull && up -d`

**Cache Docker Hub separado del staging:**
- `martorias/kuhub-app:backend-prod-cache`
- `martorias/kuhub-app:frontend-prod-cache`

### GitHub Secrets utilizados

| Secret | Descripción |
|---|---|
| `PROD_AWS_REMOTE_HOST` | IP del servidor de producción |
| `PROD_MASTER_KEY` | SSH key PEM del servidor |
| `AWS_REMOTE_USER` | Usuario SSH (ubuntu) — compartido con staging |
| `DOCKER_AWS_AC_USERNAME` | Usuario Docker Hub — compartido con staging |
| `DOCKER_AWS_AC_PASSWORD` | Contraseña Docker Hub — compartida con staging |

### Versionado (antes de cada deploy)

| Archivo | Campo | Cambio |
|---|---|---|
| `frontend/src/layouts/auth-layout.tsx` | Footer | Cambiar versión y texto |

---

## 7. Acceso SSH al Servidor

```bash
# Desde Windows (PowerShell o Git Bash)
ssh -i "E:\Dev_Codes\K\AWS-Prod\KEY\LightsailDefaultKey-us-east-1.pem" ubuntu@18.209.52.224

# Comandos útiles dentro del servidor
docker ps                                          # Contenedores activos
docker logs -f kuhub-backend                       # Logs backend en vivo
docker logs -f kuhub-frontend                      # Logs frontend en vivo
docker compose -f ~/kuhub-app/docker-compose.prod.yml restart   # Reiniciar

# PostgreSQL (desde el host OS)
sudo -u postgres psql                              # Consola postgres
PGPASSWORD='<pass>' psql -h 127.0.0.1 -U kuhub_prod kuhub_prod_db

# Recursos del sistema
free -h    # RAM
df -h /    # Disco
```

---

## 8. Puertos y Firewall Lightsail

| Puerto | Protocolo | Estado | Para qué |
|--------|-----------|--------|----------|
| 22 | TCP | ✅ Abierto | SSH |
| 80 | TCP | ✅ Abierto | HTTP (Frontend actual) |
| 443 | TCP | ✅ Abierto | HTTPS (pendiente certificado) |

---

## 9. Troubleshooting

### Contenedores no inician

```bash
docker logs kuhub-backend       # Ver error de arranque
docker logs kuhub-frontend

# Verificar que PostgreSQL acepta conexiones desde Docker
PGPASSWORD='<pass>' psql -h 172.17.0.1 -U kuhub_prod kuhub_prod_db -c "SELECT 1;"
```

### Backend no conecta a la BD

```bash
# El backend usa host.docker.internal → 172.17.0.1
# Verificar que pg_hba.conf acepta esa red
sudo grep "172.17" /etc/postgresql/17/main/pg_hba.conf

# Reiniciar PostgreSQL si se modificó pg_hba.conf
sudo systemctl restart postgresql
```

### Frontend no proxea al backend

```bash
# Verificar red Docker entre contenedores
docker exec kuhub-frontend curl -s http://backend:8080/api/v1/auth/login
# Debe retornar 400 o 401 (no 502 ni connection refused)
```

### Deploy muy rápido (< 1 min) — imágenes no actualizadas

Ocurre cuando el build previo ya subió las imágenes al cache de Docker Hub.
Es comportamiento correcto si el código no cambió. Si se necesita forzar rebuild:

```bash
# Borrar el cache en Docker Hub o agregar un cambio mínimo antes del tag
```

---

## 10. Seguridad

### ✓ Implementado

- JWT con firma por secreto externo (no hardcodeado — inyectado via `JWT_SECRET`)
- Refresh Token en cookie HttpOnly (protegido de XSS)
- Rate limiting en backend (configurado)
- Backend no expuesto directamente a Internet (solo via Nginx interno)
- Contraseñas hasheadas con BCrypt
- CORS configurado para orígenes conocidos
- PostgreSQL: autenticación scram-sha-256 desde redes Docker

### ⏳ Pendiente

- HTTPS con Let's Encrypt para `web-kuhub.questweb.cl` (en configuración)
- HSTS headers (después de activar SSL)
- Renovación automática del certificado (Certbot timer)
- CORS actualizado al subdominio `web-kuhub.questweb.cl` en `SpringSecurityConfig.java`

---

**Última actualización:** 2026-06-28 — Subdominio de producción definido: `web-kuhub.questweb.cl`. SSL en configuración.
