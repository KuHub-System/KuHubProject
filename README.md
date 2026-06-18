# KuHub — Sistema de Gestión Gastronómica

Sistema de gestión de bodega e inventario desarrollado para la escuela de Gastronomía de DuocUC. Cubre el ciclo completo desde que un docente solicita ingredientes hasta que el encargado de bodega recibe y registra el abastecimiento.

> **Estado actual:** Entorno de pruebas · v1.0.8

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Módulos del sistema](#módulos-del-sistema)
- [Roles y permisos](#roles-y-permisos)
- [Flujos de negocio principales](#flujos-de-negocio-principales)
- [Requisitos previos](#requisitos-previos)
- [Configuración local](#configuración-local)
- [Compilación y validación](#compilación-y-validación)
- [Despliegue (CI/CD)](#despliegue-cicd)
- [Variables de entorno y secretos](#variables-de-entorno-y-secretos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Convenciones y estándares](#convenciones-y-estándares)
- [Versionado](#versionado)

---

## Descripción general

KuHub centraliza la operación logística de una cocina de enseñanza:

- Los **docentes** crean solicitudes de ingredientes vinculadas a sus asignaturas, secciones y recetas.
- Los **gestores de pedidos** revisan, aceptan y consolidan esas solicitudes en pedidos semanales.
- El **encargado de bodega** recibe físicamente el pedido, registra cantidades reales y actualiza el stock.
- Los **administradores** configuran el sistema académico (asignaturas, horarios, semanas), gestionan usuarios y roles, y acceden a dashboards con KPIs en tiempo real.

Todos los datos fluyen por una API REST con autenticación JWT y un sistema de permisos dinámico por rol que se puede modificar en tiempo de ejecución desde la interfaz.

---

## Stack tecnológico

### Frontend

| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.7.3 | Tipado estático |
| Vite | 6.0.11 | Build tool y servidor de desarrollo |
| Tailwind CSS | 4.1.11 | Estilos utilitarios |
| HeroUI | 2.8.3 | Componentes UI (basado en NextUI) |
| React Router DOM | 5.3.4 | Routing (v5) |
| Axios | 1.13.2 | Cliente HTTP con interceptores de auth |
| Framer Motion | 11.18.2 | Animaciones |
| Recharts | 2.12.0 | Gráficos de dashboard |
| jsPDF + autotable | 3.0.3 / 5.0.2 | Exportación a PDF |
| xlsx / xlsx-js-style | 0.18.5 / 1.2.0 | Exportación a Excel |
| Vitest | 4.0.3 | Testing |

### Backend

| Tecnología | Versión | Rol |
|---|---|---|
| Java | 21 (LTS) | Lenguaje de plataforma |
| Spring Boot | 3.4.3 | Framework principal |
| Spring Security | — | Autenticación y autorización |
| JJWT | 0.12.6 | Generación y validación de tokens JWT |
| Spring Data JPA | — | Acceso a datos (ORM) |
| SpringDoc OpenAPI | 2.8.9 | Documentación Swagger UI automática |
| Spring Cloud OpenFeign | 2024.0.1 | Clientes HTTP declarativos |
| Lombok | 1.18.38 | Reducción de boilerplate |
| PostgreSQL Driver | 42.7.3 | Conector JDBC |

### Infraestructura

| Componente | Detalle |
|---|---|
| Base de datos | PostgreSQL 16.13 |
| Contenedores | Docker + Docker Compose |
| Reverse proxy | NGINX (host) + NGINX (interno del container frontend) |
| CI/CD | GitHub Actions (trigger por tag `K*.*.*`) |
| Registry de imágenes | Docker Hub (`martorias/kuhub-app`) |
| Servidor de aplicación | AWS Lightsail — Ubuntu 20.04 · 2 GB RAM · 2 vCPU |
| Servidor de base de datos | AWS Lightsail — Ubuntu 24.04 · 512 MB RAM + 1.5 GB Swap |
| Comunicación interna | VPC Peering (IP privada `172.26.12.228`) |
| SSL/TLS | Let's Encrypt vía Certbot (renovación automática) |
| Dominio | `appkuhub.questweb.cl` |

---

## Arquitectura

El sistema es un **monolito modular**: un único backend Spring Boot organizado en 9 módulos de dominio, con un frontend React desacoplado que se comunica exclusivamente vía API REST.

```
Cliente (HTTPS)
    ↓
NGINX Host :443 — termina TLS, proxy → :3000
    ↓
Frontend Container (React + NGINX)
    ↓  /api/*
Backend Container (Spring Boot :8080)
    ↓  TCP 5432 · VPC Peering
PostgreSQL 16.13 (instancia separada)
```

### Modelo de seguridad

Cada request autenticado pasa por dos filtros de Spring Security:

1. **`JwtAuthenticationFilter`** — genera el token al hacer login (`POST /api/v1/auth/login`).
2. **`JwtValidationFilter`** — valida el token en cada request y carga permisos del usuario.
3. **`RateLimitFilter`** — limita el número de requests por usuario por ventana de tiempo.
4. **`DynamicPermissionService`** — resuelve permisos granulares (leer/crear/actualizar/eliminar) por rol y módulo en tiempo de ejecución.

Los permisos son configurables por un administrador desde la página `/gestion-roles` sin necesidad de redeploy.

---

## Módulos del sistema

| Módulo backend | Entidades principales | Descripción |
|---|---|---|
| `gestion_usuario` | Usuario, Rol | Autenticación, CRUD de usuarios, gestión de roles |
| `gestion_academica` | Asignatura, Seccion, Sala, BloqueHorario, ReservaSala, Semana | Estructura académica del período |
| `gestion_inventario` | Producto, Inventario, Categoria, UnidadMedida, Movimiento, BodegaTransito | Stock, movimientos, tránsito de bodega |
| `gestion_solicitud` | Solicitud, DetalleSolicitud | Solicitudes de ingredientes de docentes |
| `gestion_pedido` | Pedido, DetallePedido, PedidoSolicitud | Consolidación y gestión de pedidos |
| `gestion_proveedor` | Proveedor, ContactoProveedor | Base de datos de proveedores |
| `gestion_sistema` | ConfiguracionSistema | Configuración global del sistema |
| `pedido_semana_a_bodega` | PedidoSemanal | Pedidos semanales especiales a bodega |
| `dashboard` | — | Consultas agregadas para KPIs por rol |

### Tabla `movimiento` — particionamiento

La tabla `movimiento` usa **particionamiento por rango** (`PARTITION BY RANGE (fecha_movimiento)`) en semestres. Esto permite consultas eficientes sobre historial de stock sin degradación con el paso del tiempo. El `ALTER TABLE` sobre el padre propaga automáticamente a todas las particiones.

---

## Roles y permisos

El sistema define **7 roles predeterminados** con una matriz de permisos dinámica (CRUD por módulo). Un administrador puede modificarla en tiempo real desde `/gestion-roles`.

| Rol | Acceso |
|---|---|
| **Administrador** | Control total — todos los módulos con CRUD completo |
| **Co-Administrador** | Igual al Administrador excepto Gestión Roles, Gestión Usuarios y Admin Sistema |
| **Gestor de Pedidos** | Dashboard (lectura), Gestión Solicitudes, Gestión Pedidos, Conglomerado Pedidos |
| **Profesor a Cargo** | Dashboard (lectura), Solicitud (crear/editar) |
| **Docente** | Dashboard (lectura), Solicitud (solo lectura) |
| **Encargado de Bodega** | Dashboard, Inventario, Categorías, Unidades, Historial Movimientos, Bodega Tránsito, Pedidos Diarios |
| **Asistente de Bodega** | Dashboard, Bodega Tránsito, Historial Movimientos (lectura), Pedidos Diarios, Categorías/Unidades (lectura) |

---

## Flujos de negocio principales

### 1. Solicitud de ingredientes (Docente)

```
Docente accede a /solicitud
  → Selecciona Asignatura → Sección → Horario → Pedido Semanal
  → Sistema calcula: cantidad inscritos × porción
  → Docente ajusta manualmente si es necesario
  → POST /api/v1/solicitud/generate-mass-solicitions
  → Solicitud creada con estado PENDIENTE
```

### 2. Revisión y consolidación (Gestor de Pedidos)

```
Gestor accede a /gestion-solicitudes
  → Filtra por semana, acepta o rechaza solicitudes en masa
  → PATCH /api/v1/solicitud/change-massive-status

Gestor accede a /gestion-pedidos
  → POST /api/v1/solicitud/consolidate → preview del pedido consolidado
  → POST /api/v1/pedido/consolidate-order → crea Pedido (estado PENDIENTE)
```

### 3. Recepción de pedido (Encargado de Bodega)

```
Encargado accede a /bodega-transito
  → Revisa productos en tránsito, ajusta cantidades reales
  → POST /api/v1/bodega-transito/confirmar
    → UPDATE inventario.stock += cantidadReal
    → INSERT movimiento (tipo: ENTRADA_INVENTARIO o ENTRADA_BODEGA)
    → UPDATE bodega_transito.estado = 'RECIBIDA'
```

### Estados de Solicitud

```
PENDIENTE → ACEPTADA → EN_PEDIDO
          → RECHAZADA
          → PROCESADA
```

### Estados de Pedido

```
PENDIENTE → APROBADO → EN_PREPARACION → ENTREGADO
          → CANCELADO
```

---

## Requisitos previos

### Backend

- **JDK 21** — el proyecto usa Microsoft OpenJDK 21 LTS (`C:\Users\Matheus\.jdks\ms-21.0.9` en la máquina de desarrollo)
- **Maven** — no es necesario instalarlo globalmente; usar el wrapper `mvnw` / `mvnw.cmd` en la raíz del proyecto
- **PostgreSQL 16** — base de datos corriendo accesible en el `SPRING_DATASOURCE_URL` configurado

### Frontend

- **Node.js 20+**
- **npm** (incluido con Node)

### Despliegue

- **Docker** y **Docker Compose**
- Cuenta en **Docker Hub** con acceso al repositorio `martorias/kuhub-app`
- Acceso SSH a la instancia AWS Lightsail

---

## Configuración local

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd KuHubProject
```

### 2. Configurar el backend

Crear el perfil de desarrollo local en `backend/src/main/resources/application-mat.properties` (o cualquier nombre de perfil) con las credenciales de tu base de datos local:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/kuhub_devs
spring.datasource.username=tu_usuario
spring.datasource.password=tu_password
spring.jpa.hibernate.ddl-auto=none
```

Activar el perfil al correr la aplicación en el IDE agregando `-Dspring.profiles.active=mat` (o el nombre que hayas elegido) a las opciones de la JVM.

### 3. Configurar el frontend

```bash
cd frontend
cp .env.example .env.local   # si existe, o crear manualmente
```

Contenido mínimo de `.env.local`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Instalar dependencias e iniciar el servidor de desarrollo:

```bash
npm install
npm run dev
# Disponible en http://localhost:5173
```

---

## Compilación y validación

> La máquina de desarrollo no tiene `mvn` ni `JAVA_HOME` en el PATH global. Usar siempre el wrapper.

### Backend (desde la raíz del proyecto)

```bash
# Windows — PowerShell o CMD
set JAVA_HOME=C:\Users\Matheus\.jdks\ms-21.0.9
./mvnw.cmd -f backend/pom.xml -o -DskipTests compile
```

```bash
# Bash
export JAVA_HOME="C:\Users\Matheus\.jdks\ms-21.0.9"
./mvnw.cmd -f backend/pom.xml -o -DskipTests compile 2>&1 | tail -30
```

La bandera `-o` (offline) evita resolver dependencias en cada corrida. Quitar `-DskipTests` para ejecutar los tests.

> **Nota:** El deploy hace `package` (compila tests aunque se use `-DskipTests`). Para validar el build de CI localmente, usar `test-compile` en lugar de solo `compile`.

### Frontend

```bash
# Type-check sin emitir (rápido)
cd frontend
npx --no-install tsc --noEmit --project tsconfig.json 2>&1 | tail -30

# Build completo (equivalente al CI)
npm run build
```

El build de producción usa `tsc --noCheck && vite build`, por lo que errores de tipos preexistentes no bloquean el build. Filtrar solo los archivos modificados al validar:

```bash
npx --no-install tsc --noEmit 2>&1 | grep "mi-archivo.tsx"
```

---

## Despliegue (CI/CD)

El pipeline se dispara automáticamente al hacer push de un tag con formato `K*.*.*`.

### Flujo completo

```
git add <archivos>
git commit -m "descripción del cambio"
git push

git tag K1.0.X
git push origin K1.0.X
```

GitHub Actions ejecuta en paralelo:

1. **Build backend** — Maven 3.9 + Java 21 · imagen multistage (`maven:alpine` → `eclipse-temurin:21-jre-alpine`) · ~200-250 MB final
2. **Build frontend** — Node 20 · imagen multistage (`node:alpine` → `nginx:1.25-alpine`) · ~40-50 MB final
3. Push de ambas imágenes a Docker Hub con el tag de la versión
4. SSH a Lightsail → `docker compose down` → `docker compose pull` → `docker compose up -d`

El deploy completo toma aproximadamente **5-10 minutos**. Verificar en `https://appkuhub.questweb.cl/login`.

### Deploy manual (en caso de falla del CI)

```bash
ssh -i /ruta/a/key.pem ubuntu@52.5.222.79
cd ~/kuhub-app

sed -i "s/^TAG=.*/TAG=K1.0.X/" .env

docker compose down
docker image prune -af
docker compose pull
docker compose up -d

docker ps
docker logs -f kuhub-backend
```

---

## Variables de entorno y secretos

Todos los secretos se almacenan en **GitHub Actions Secrets** (Repository Settings → Secrets and variables → Actions). Nunca deben aparecer en el repositorio.

| Variable | Descripción |
|---|---|
| `DOCKER_AWS_AC_USERNAME` | Usuario de Docker Hub |
| `DOCKER_AWS_AC_PASSWORD` | Token de acceso (PAT) de Docker Hub |
| `KUHUB_MASTER_KEY` | Clave SSH privada EC2 en base64 para acceso a Lightsail |
| `AWS_REMOTE_HOST` | IP pública de la instancia de aplicación en Lightsail |
| `AWS_REMOTE_USER` | Usuario SSH de Ubuntu en Lightsail |
| `SPRING_DATASOURCE_URL` | URL JDBC completa (`jdbc:postgresql://172.26.12.228:5432/kuhub_devs`) |
| `KU_AWS_AC_DB_USER` | Usuario de PostgreSQL |
| `KU_AWS_AC_DB_PASS` | Contraseña de PostgreSQL |
| `KU_AWS_AC_DB_HOST` | IP privada de la instancia de base de datos |
| `KU_AWS_AC_DB_PORT` | Puerto de PostgreSQL (5432) |
| `VITE_API_URL` | URL base de la API para el build del frontend |

El archivo `.env` en el servidor (`~/kuhub-app/.env`) es generado automáticamente por el pipeline con estas variables. **No versionar este archivo.**

### Rotación recomendada de secretos críticos

| Secret | Frecuencia |
|---|---|
| `KU_AWS_AC_DB_PASS` | Cada 3-6 meses |
| `DOCKER_AWS_AC_PASSWORD` | Cada 6 meses |
| `KUHUB_MASTER_KEY` | Anual o ante exposición |

---

## Estructura del proyecto

```
KuHubProject/
├── backend/                        # Spring Boot (Java 21)
│   └── src/main/java/KuHub/
│       ├── config/
│       │   └── security/           # JWT filters, rate limiting, permisos dinámicos
│       ├── modules/
│       │   ├── gestion_usuario/
│       │   ├── gestion_academica/
│       │   ├── gestion_inventario/
│       │   ├── gestion_solicitud/
│       │   ├── gestion_pedido/
│       │   ├── gestion_proveedor/
│       │   ├── gestion_sistema/
│       │   ├── pedido_semana_a_bodega/
│       │   └── dashboard/
│       └── utils/                  # PaginationUtils, StringUtils
│
├── frontend/                       # React 18 + TypeScript + Vite
│   └── src/
│       ├── pages/                  # 18 páginas lazy-loaded
│       ├── components/             # Componentes reutilizables
│       ├── services/               # 25+ clientes API tipados con Axios
│       ├── types/                  # Interfaces TypeScript por dominio
│       ├── contexts/               # Auth, Permisos, Tema
│       ├── hooks/                  # useToast, useConfirm, useModulePermission
│       ├── layouts/                # auth-layout, main-layout
│       └── App.tsx                 # Router principal + ProtectedRoute
│
├── diagramas/                      # Archivos draw.io (4+1 Views)
├── docker-compose.yml              # Orquestación de containers
├── pom.xml                         # POM raíz Maven (multi-módulo)
└── .github/workflows/              # Pipeline CI/CD (GitHub Actions)
```

Cada módulo del backend sigue la misma estructura interna:

```
<modulo>/
├── controller/
├── dtos/
│   ├── request/
│   └── response/
├── entity/
├── exceptions/
├── repository/
└── services/
    ├── <Servicio>Service.java         # Interfaz
    └── <Servicio>ServiceImpl.java     # Implementación
```

---

## Convenciones y estándares

### Backend

- **Eliminación lógica:** todo el sistema usa `activo = false`. Nunca se ejecutan `DELETE` reales en la base de datos.
- **DTOs de respuesta:** elegir entre DTO (clase), Proyección (interfaz) o Record según la complejidad. Ver `backend/CLAUDE.md` §3.
- **Consultas nativas:** tres patrones según el nivel de anidamiento — `List<Object[]>` (plano), `String` con `json_agg` (1-2 niveles), `String` con `jsonb_agg` (jerarquía profunda o CTEs).
- **Transacciones:** `@Transactional(readOnly = true)` en métodos de solo lectura; `@Transactional` en escrituras.
- **Nuevos endpoints:** siempre registrar en `SpringSecurityConfig` con el rol correspondiente para evitar 403.

### Frontend

- **Nunca `any`** en TypeScript. Crear interfaz para cada contrato de datos.
- **Sin `style={{}}`** inline — solo clases Tailwind.
- **Sin `window.alert/confirm`** — usar `useToast()` con `useConfirm()`.
- **Routing:** el proyecto usa React Router **v5** (`<Switch>`, `<Route>`, `<Redirect>`), no v6.
- **Nueva página:** seguir los 6 pasos del checklist en `frontend/CLAUDE.md` §14 (archivo, import lazy, ruta protegida, SmartRedirect, sidebar, registro de permisos).

### Actualización de versión al hacer deploy

Antes de crear el tag, actualizar el número de versión en:

- `frontend/src/layouts/auth-layout.tsx`
- `frontend/src/components/footer.tsx`

```tsx
// Cambiar a la versión del tag que se va a publicar
© {new Date().getFullYear()} KuHub · Entorno de Pruebas | v1.0.X
```

---

## Versionado

**Formato:** `K<mayor>.<menor>.<parche>` — ejemplo: `K1.0.8`

| Dígito | Cuándo incrementar |
|---|---|
| `<parche>` | Bugfixes, cambios menores, hotfixes |
| `<menor>` | Nuevas funcionalidades |
| `<mayor>` | Cambios de arquitectura o refactors grandes |

**Regla:** una tag por día, mismo número todo el día. No crear múltiples tags el mismo día por cada commit.

El historial de versiones y el contexto de cada cambio se documentan en los archivos `CONTEXTO_*.md` del repositorio.

---

## Documentación adicional

| Archivo | Contenido |
|---|---|
| `ARQUITECTURA_4+1_VIEWS.md` | Diagramas completos de arquitectura (Mermaid) |
| `DIAGRAMA_ER_KUHUB.md` | Diagrama entidad-relación de la base de datos |
| `CONTEXTO_GENERAL.md` | Decisiones técnicas y contexto de implementación |
| `GESTION_PERMISO.md` | Diseño del sistema de permisos dinámico |
| `BACKUP_POSTGRESQL_SETUP.md` | Procedimiento de backup y restauración de la base de datos |
| `CONFIGURATION_HOST_DEVS.md` | Configuración del servidor de desarrollo |
