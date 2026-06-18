# KuHub — Sistema de Gestión Gastronómica

Sistema de gestión de bodega e inventario desarrollado para la escuela de Gastronomía de DuocUC. Cubre el ciclo completo desde que un docente solicita ingredientes hasta que el encargado de bodega recibe y registra el abastecimiento.

> **Estado actual:** Entorno de pruebas · v1.0.8

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso / Ejecución](#uso--ejecución)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Base de datos](#base-de-datos)
- [Documentación de la API](#documentación-de-la-api)
- [Estructura del equipo / Autores](#estructura-del-equipo--autores)
- [Tests / Pruebas](#tests--pruebas)
- [Licencia](#licencia)
- [Módulos del sistema](#módulos-del-sistema)
- [Roles y permisos](#roles-y-permisos)
- [Flujos de negocio principales](#flujos-de-negocio-principales)
- [Despliegue (CI/CD)](#despliegue-cicd)
- [Variables de entorno y secretos](#variables-de-entorno-y-secretos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Convenciones y estándares](#convenciones-y-estándares)
- [Versionado](#versionado)

---

## Descripción

KuHub centraliza la operación logística de una cocina de enseñanza:

- Los **docentes** crean solicitudes de ingredientes vinculadas a sus asignaturas, secciones y recetas.
- Los **gestores de pedidos** revisan, aceptan y consolidan esas solicitudes en pedidos semanales.
- El **encargado de bodega** recibe físicamente el pedido, registra cantidades reales y actualiza el stock.
- Los **administradores** configuran el sistema académico (asignaturas, horarios, semanas), gestionan usuarios y roles, y acceden a dashboards con KPIs en tiempo real.

Todos los datos fluyen por una API REST con autenticación JWT y un sistema de permisos dinámico por rol que se puede modificar en tiempo de ejecución desde la interfaz.

---

## Tecnologías utilizadas

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

## Requisitos previos

### Backend

- **JDK 21** — se recomienda Microsoft OpenJDK 21 LTS o equivalente
- **Maven** — no es necesario instalarlo globalmente; usar el wrapper `mvnw` / `mvnw.cmd` incluido en la raíz del proyecto
- **PostgreSQL 16** — instancia corriendo y accesible con las credenciales configuradas

### Frontend

- **Node.js 20+**
- **npm** (incluido con Node)

### Despliegue

- **Docker** y **Docker Compose**
- Cuenta en **Docker Hub** con acceso al repositorio `martorias/kuhub-app`
- Acceso SSH a la instancia AWS Lightsail

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd KuHubProject
```

### 2. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 3. Compilar el backend (verificación local)

```bash
# Desde la raíz del proyecto — Linux/macOS
export JAVA_HOME=/ruta/a/jdk21
./mvnw -f backend/pom.xml -DskipTests compile

# Windows (PowerShell / CMD)
set JAVA_HOME=C:\ruta\a\jdk21
./mvnw.cmd -f backend/pom.xml -DskipTests compile
```

---

## Configuración

### Backend — perfil local

Crear el archivo `backend/src/main/resources/application-local.properties` con las credenciales de la base de datos local:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/kuhub_devs
spring.datasource.username=tu_usuario
spring.datasource.password=tu_password
spring.jpa.hibernate.ddl-auto=none
```

Activar el perfil en el IDE agregando `-Dspring.profiles.active=local` a las opciones de la JVM.

### Frontend — variables de entorno

```bash
cd frontend
cp .env.example .env.local   # si existe, o crear manualmente
```

Contenido mínimo de `.env.local`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

### Secretos de CI/CD

Los secretos de producción se almacenan en **GitHub Actions Secrets**. Ver la sección [Variables de entorno y secretos](#variables-de-entorno-y-secretos) para el listado completo.

---

## Uso / Ejecución

### Entorno de desarrollo local

**Backend** — ejecutar desde el IDE (IntelliJ IDEA recomendado) con el perfil configurado, o via Maven:

```bash
# Desde la raíz del proyecto
export JAVA_HOME=/ruta/a/jdk21
./mvnw -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=local
```

**Frontend** — servidor de desarrollo con hot-reload:

```bash
cd frontend
npm run dev
# Disponible en http://localhost:5173
```

### Build de producción

```bash
# Frontend
cd frontend && npm run build   # genera dist/ optimizado

# Backend
./mvnw -f backend/pom.xml package -DskipTests  # genera JAR en backend/target/
```

### Aplicación desplegada

La versión en producción está disponible en: `https://appkuhub.questweb.cl/login`

### Credencial de prueba (solo entorno de desarrollo)

El sistema incluye un usuario administrador por defecto al restaurar el backup de desarrollo. Consultar `BACKUP_BBDD_DEVS.md` para instrucciones de restauración.

---

## Arquitectura del proyecto

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

Cada request autenticado pasa por los siguientes filtros de Spring Security:

1. **`JwtAuthenticationFilter`** — genera el token al hacer login (`POST /api/v1/auth/login`).
2. **`JwtValidationFilter`** — valida el token en cada request y carga permisos del usuario.
3. **`RateLimitFilter`** — limita el número de requests por usuario por ventana de tiempo.
4. **`DynamicPermissionService`** — resuelve permisos granulares (leer/crear/actualizar/eliminar) por rol y módulo en tiempo de ejecución.

Los permisos son configurables por un administrador desde la página `/gestion-roles` sin necesidad de redeploy.

### Optimización de red — Compresión Gzip

El container del frontend (NGINX interno) aplica compresión Gzip sobre todas las respuestas que pasan por el proxy hacia el backend. Esto reduce el peso de los payloads JSON de la API REST sin ningún cambio en el código de la aplicación.

```
Backend (Spring Boot)  →  JSON sin comprimir  →  NGINX interno
NGINX interno          →  gzip (nivel 5)       →  navegador
Navegador (Axios)      →  descomprime automáticamente vía Accept-Encoding
```

Configuración activa en `frontend/nginx.conf`:

| Parámetro | Valor | Efecto |
|---|---|---|
| `gzip_proxied any` | `any` | Comprime respuestas que vienen del proxy (backend) |
| `gzip_comp_level` | `5` | Punto óptimo velocidad/ratio de compresión (escala 1-9) |
| `gzip_min_length` | `2048` | Solo comprime respuestas mayores a 2 KB (las pequeñas no justifican el overhead) |
| `gzip_types` | `application/json`, `text/*`, `application/javascript` | Aplica solo a tipos de contenido comprimibles |
| `gzip_vary` | `on` | Agrega el header `Vary: Accept-Encoding` para compatibilidad con proxies intermedios |

El navegador envía automáticamente `Accept-Encoding: gzip` y Axios descomprime la respuesta de forma transparente. El ahorro típico en payloads JSON es del **60–80 %**, lo que reduce la latencia percibida especialmente en listados grandes (inventario, pedidos, movimientos).

---

## Base de datos

El proyecto utiliza **PostgreSQL 16.13**. El esquema es gestionado manualmente (no se usa Flyway ni Liquibase); `spring.jpa.hibernate.ddl-auto=none` en todos los entornos.

### Tablas principales

| Tabla | Descripción |
|---|---|
| `usuario` / `rol` | Autenticación y control de acceso |
| `asignatura` / `seccion` / `semana` | Estructura académica del período |
| `producto` / `inventario` / `categoria` / `unidad_medida` | Catálogo y stock de ingredientes |
| `solicitud` / `detalle_solicitud` | Solicitudes de ingredientes por docente |
| `pedido` / `detalle_pedido` / `pedido_solicitud` | Pedidos consolidados a proveedores |
| `proveedor` / `contacto_proveedor` | Base de datos de proveedores |
| `bodega_transito` | Productos en tránsito pendientes de recepción |
| `movimiento` | Historial completo de movimientos de stock (particionado) |
| `configuracion_sistema` | Parámetros globales del sistema |

### Particionamiento

La tabla `movimiento` usa **particionamiento por rango** (`PARTITION BY RANGE (fecha_movimiento)`) en semestres. Esto permite consultas eficientes sobre historial de stock sin degradación con el tiempo.

### Diagrama

El diagrama entidad-relación completo está disponible en [`DIAGRAMA_ER_KUHUB.md`](DIAGRAMA_ER_KUHUB.md).

El script SQL inicial de la base de datos se encuentra en [`ConexionXD_v2.sql`](ConexionXD_v2.sql).

---

## Documentación de la API

La API REST está documentada automáticamente con **SpringDoc OpenAPI (Swagger UI)**.

Una vez que el backend esté corriendo, acceder a:

```
http://localhost:8080/swagger-ui/index.html
```

### Grupos de endpoints principales

| Prefijo | Módulo |
|---|---|
| `POST /api/v1/auth/login` | Autenticación — obtener token JWT |
| `/api/v1/usuario/**` | Gestión de usuarios |
| `/api/v1/rol/**` | Gestión de roles y permisos |
| `/api/v1/solicitud/**` | Solicitudes de ingredientes |
| `/api/v1/pedido/**` | Pedidos consolidados |
| `/api/v1/inventario/**` | Stock e inventario |
| `/api/v1/producto/**` | Catálogo de productos |
| `/api/v1/proveedor/**` | Proveedores |
| `/api/v1/bodega-transito/**` | Recepción de pedidos |
| `/api/v1/dashboard/**` | KPIs y métricas por rol |
| `/api/v1/sistema/**` | Configuración global |

Todos los endpoints (excepto `/auth/login`) requieren el header `Authorization: Bearer <token>`.

---

## Estructura del equipo / Autores

| Nombre | Área | Responsabilidades |
|---|---|---|
| **Matheus de Lara** | Fullstack | Arquitecto del sistema y responsable general del proyecto. Planificación de arquitectura y modelo de base de datos. Desarrollo backend (integración y lógica de negocio) e implementación de vistas personalizadas en el frontend. Infraestructura, CI/CD y despliegue. Contacto secundario con el cliente cuando Francisco no puede comparecer. |
| **Francisco Gomes** | Fullstack | Desarrollo backend y frontend según necesidad. Especialista en base de datos (diseño de consultas, optimización y migraciones). Contacto principal con el cliente: levantamiento de requerimientos y acuerdos. |
| **Benjamin Aravena** | Fullstack | Responsable de la experiencia de usuario (UX) e implementaciones frontend de alta calidad con tecnologías modernas. Contacto auxiliar con el cliente. |

---

## Tests / Pruebas

### Frontend (Vitest)

El proyecto tiene **Vitest 4.0.3** configurado como framework de testing. Para ejecutar las pruebas:

```bash
cd frontend
npm run test        # ejecutar suite de tests
npm run test -- --coverage   # con reporte de cobertura
```

> Las pruebas unitarias están en proceso de implementación. El stack está configurado y listo para agregar casos de prueba en archivos `*.test.ts` / `*.test.tsx`.

### Backend (JUnit / Spring Boot Test)

```bash
# Desde la raíz del proyecto
export JAVA_HOME=/ruta/a/jdk21
./mvnw -f backend/pom.xml test
```

---

## Licencia

Proyecto académico desarrollado para la asignatura de Taller de Proyecto en **DuocUC**. Todos los derechos reservados.

El uso, distribución o modificación del código fuente fuera del contexto académico debe contar con autorización explícita de los autores.

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

Cada módulo sigue la misma estructura interna:

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
    ├── <Servicio>Service.java
    └── <Servicio>ServiceImpl.java
```

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

## Despliegue (CI/CD)

El pipeline se dispara automáticamente al hacer push de un tag con formato `K*.*.*`.

### Flujo completo

```bash
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

El deploy completo toma aproximadamente **5-10 minutos**.

### Deploy manual (en caso de falla del CI)

```bash
ssh -i /ruta/a/key.pem ubuntu@<IP>
cd ~/kuhub-app

sed -i "s/^TAG=.*/TAG=K1.0.X/" .env

docker compose down
docker image prune -af
docker compose pull
docker compose up -d
```

---

## Variables de entorno y secretos

Todos los secretos se almacenan en **GitHub Actions Secrets**. Nunca deben aparecer en el repositorio.

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

El archivo `.env` en el servidor es generado automáticamente por el pipeline. **No versionar este archivo.**

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
│       └── utils/
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

---

## Convenciones y estándares

### Backend

- **Eliminación lógica:** todo el sistema usa `activo = false`. Nunca se ejecutan `DELETE` reales.
- **DTOs de respuesta:** DTO (clase), Proyección (interfaz) o Record según la complejidad.
- **Consultas nativas:** `List<Object[]>` (plano), `String` con `json_agg` (1-2 niveles), `String` con `jsonb_agg` (jerarquía profunda o CTEs).
- **Transacciones:** `@Transactional(readOnly = true)` en lecturas; `@Transactional` en escrituras.
- **Nuevos endpoints:** siempre registrar en `SpringSecurityConfig` para evitar 403.

#### Por qué se usa `Object[]` en consultas de reporte y dashboard

Las consultas orientadas a estadísticas, métricas y reportes (dashboard, KPIs, conteos por semana) utilizan proyecciones `Object[]` en lugar de retornar entidades completas. La razón es que Hibernate, al mapear entidades, ejecuta trabajo adicional que no aporta valor en estos contextos:

- Instanciación de un objeto de entidad por cada registro recuperado.
- Registro de cada entidad en el contexto de persistencia (*Session*).
- Seguimiento de cambios (*dirty checking*) sobre datos que nunca se van a modificar.
- Resolución de relaciones y metadatos asociados.

Con `Object[]`, Hibernate actúa solo como intermediario entre la base de datos y la aplicación, entregando los valores sin construir ni administrar entidades. Esto reduce consumo de CPU y memoria en la capa de aplicación.

**Impacto estimado por volumen de registros:**

| Registros | Diferencia en tiempo de respuesta (capa de aplicación) |
|---|---|
| Hasta 1.000 | Marginal — imperceptible en producción |
| 10.000 – 50.000 | Mejora del 10 % al 30 % |
| 100.000 o más | Mejora significativa, dependiente de la infraestructura |

> El mayor tiempo de ejecución siempre corresponde al motor de base de datos (JOINs, GROUP BY, índices). Reducir la sobrecarga de Hibernate no reemplaza la optimización de las queries, pero mantiene los tiempos de respuesta estables y predecibles conforme el volumen de datos crece.

Este criterio aplica exclusivamente a consultas de solo lectura con resultados agregados. Las operaciones de persistencia (crear, actualizar) siguen usando entidades JPA de forma normal.

### Frontend

- **Sin `any`** en TypeScript. Crear interfaz para cada contrato de datos.
- **Sin `style={{}}`** inline — solo clases Tailwind.
- **Sin `window.alert/confirm`** — usar `useToast()` con `useConfirm()`.
- **Routing:** React Router **v5** (`<Switch>`, `<Route>`, `<Redirect>`), no v6.

---

## Versionado

**Formato:** `K<mayor>.<menor>.<parche>` — ejemplo: `K1.0.8`

| Dígito | Cuándo incrementar |
|---|---|
| `<parche>` | Bugfixes, cambios menores, hotfixes |
| `<menor>` | Nuevas funcionalidades |
| `<mayor>` | Cambios de arquitectura o refactors grandes |

**Regla:** una tag por día, mismo número todo el día. El historial de versiones y el contexto de cada cambio se documentan en los archivos `CONTEXTO_*.md` del repositorio.

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
