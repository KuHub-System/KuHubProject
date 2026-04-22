# 📋 GESTIÓN DE PERMISOS — KuHub

> **Regla fundamental:** No debe existir lógica hardcodeada de roles ni permisos.                                                                                                                                                   
> Todos los roles y permisos se consultan **dinámicamente desde la base de datos** en tiempo de ejecución.
                                                                                                                                                                                                                                    
---                                                                                                                                                                                                                                 

## Índice

1. [Definición de Roles](#1-definición-de-roles)
2. [Definición de Módulos](#2-definición-de-módulos)
3. [Definición de Permisos](#3-definición-de-permisos)
4. [Relación Roles × Módulos (Matriz de Permisos)](#4-relación-roles--módulos-matriz-de-permisos)
5. [Flujo de Validación — Backend](#5-flujo-de-validación--backend)
6. [Flujo de Validación — Frontend](#6-flujo-de-validación--frontend)
7. [Comportamiento de la UI según Nivel de Permiso](#7-comportamiento-de-la-ui-según-nivel-de-permiso)
8. [Estructura de Archivos](#8-estructura-de-archivos)
9. [SQL de Referencia](#9-sql-de-referencia)
10. [Guía para Agregar un Nuevo Permiso/Módulo](#10-guía-para-agregar-un-nuevo-permisomódulo)

---                                                                                                                                                                                                                                 

## 1. Definición de Roles

Los roles se almacenan en la tabla `rol` y se consultan dinámicamente. **Nunca** se debe comparar contra strings hardcodeados en lógica de negocio.

| `nombre_rol`        | Descripción                                                    |                                                                                                                                            
|----------------------|----------------------------------------------------------------|                                                                                                                                           
| `ADMINISTRADOR`      | Acceso total a todos los módulos del sistema                   |                                                                                                                                           
| `CO_ADMINISTRADOR`   | Acceso amplio, excepto Gestión de Roles y Admin del Sistema    |                                                                                                                                           
| `GESTOR_PEDIDOS`     | Dashboard + Pedidos + Solicitudes + Conglomerado               |                                                                                                                                           
| `PROFESOR_A_CARGO`   | Dashboard + Solicitud (crear/editar) + Recetas (lectura)       |                                                                                                                                           
| `DOCENTE`            | Dashboard + Solicitud (solo lectura) + Recetas (lectura)       |                                                                                                                                           
| `ENCARGADO_BODEGA`   | Dashboard + Inventario (CRUD)                                  |                                                                                                                                           
| `ASISTENTE_BODEGA`   | Dashboard + Bodega de Tránsito (lectura + crear)               |                                                                                                                                           

### Tabla DDL

```sql                                                                                                                                                                                                                              
CREATE TABLE IF NOT EXISTS rol (                                                                                                                                                                                                    
    id_rol      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,                                                                                                                                                                   
    nombre_rol  VARCHAR(100) NOT NULL,                                                                                                                                                                                              
    activo      BOOLEAN      NOT NULL DEFAULT TRUE                                                                                                                                                                                  
);                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                    

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


2. Definición de Módulos                                                                                                                                                                                                            

Cada módulo representa una funcionalidad o sección del sistema. Se almacenan en la tabla modulo.                                                                                                                                    

                                                                                  
 codigo_modulo  nombre_modulo  orden  Descripción                                      
 ──────────────────────────────────────────────────────────────────────────────────────────────────── 
 DASHBOARD             Dashboard                1      Panel principal con estadísticas y métricas      
 INVENTARIO            Inventario               2      Gestión de productos e inventario                
 SOLICITUD             Solicitudes              3      Creación y seguimiento de solicitudes de insumos 
 GESTION_PEDIDOS       Gestión de Pedidos       4      Administración y seguimiento de pedidos          
 GESTION_SOLICITUDES   Gestión de Solicitudes   5      Administración de solicitudes del sistema            
 CONGLOMERADO_PEDIDOS  Conglomerado de Pedidos  6      Agrupación y consolidación de pedidos masivos        
 GESTION_PROVEEDORES   Gestión de Proveedores   7      Administración de proveedores                        
 BODEGA_TRANSITO       Bodega de Tránsito          8      Control de productos en tránsito y despacho          
 GESTION_RECETAS       Gestión de Recetas          9      Administración de recetas y preparaciones culinarias 
 GESTION_ACADEMICA     Gestión Académica           10     Administración de asignaturas y secciones            
 GESTION_ROLES         Gestión de Roles            11     Administración de roles y permisos del sistema       
 GESTION_USUARIOS      Gestión de Usuarios         12     Administración de usuarios del sistema               
 ADMIN_SISTEMA         Administración del Sistema  13     Centro de control: horarios, semanas y salas         
                                                                                                               

Tabla DDL                                                                                                                                                                                                                           

                                                                                                                                                                                                                                    
CREATE TABLE IF NOT EXISTS modulo (                                                                                                                                                                                                 
    id_modulo                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,                                                                                                                                                   
    codigo_modulo               VARCHAR(50)  NOT NULL UNIQUE,                                                                                                                                                                       
    nombre_modulo               VARCHAR(100) NOT NULL,                                                                                                                                                                              
    descripcion_modulo          TEXT,                                                                                                                                                                                               
    icono_modulo                VARCHAR(100),                                                                                                                                                                                       
    orden_modulo                INTEGER      NOT NULL DEFAULT 0,                                                                                                                                                                    
    fecha_creacion_modulo       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,                                                                                                                                                    
    fecha_actualizacion_modulo  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,                                                                                                                                                    
    enabled                     BOOLEAN      NOT NULL DEFAULT TRUE                                                                                                                                                                  
);                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                    

▌ Nota: El campo codigo_modulo debe coincidir exactamente con los ModuleKey definidos en frontend/src/types/permissions.types.ts.                                                                                                 

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


3. Definición de Permisos                                                                                                                                                                                                           

La tabla permiso_rol es una tabla junction que relaciona un rol con un modulo y define 4 flags CRUD:                                                                                                                                
La validación de permisos se basa en la **intención de la acción** y no estrictamente en el verbo HTTP, ya que un endpoint `POST` puede usarse tanto para insertar nuevos datos como para realizar consultas complejas (búsquedas con filtros en el body).
                                                           
 Flag              Significado                             
 ───────────────────────────────────────────────────────── 
 puede_leer        Permite visualizar y consultar información. | `GET /api/modulos`<br>`POST /api/modulos/buscar` (Lectura con filtros) |   
 puede_crear       Permite insertar o registrar nuevos datos en el sistema. | `POST /api/modulos/crear`<br>`POST /api/modulos/importar` |         
 puede_actualizar  Permite modificar registros existentes. | `PUT /api/modulos/{id}`<br>`PATCH /api/modulos/{id}/estado` | 
 puede_eliminar    Permite borrar o inactivar registros. | `DELETE /api/modulos/{id}` |   
                                                           

Niveles de Acceso (derivados)                                                                                                                                                                                                       

                                                                                   
 Nivel       Condición                                                              
 ────────────────────────────────────────────────────────────────────────────────── 
 ESCRITURA   puede_crear = true OR puede_actualizar = true OR puede_eliminar = true 
 LECTURA     Solo puede_leer = true (los demás en false)                            
 SIN_ACCESO  Todos los flags en false o sin registro en la tabla                    
                                                                                    

▌ Esta lógica se implementa en PermisoMatrizDTO.getNivelAcceso().                                                                                                                                                                 

Tabla DDL                                                                                                                                                                                                                           

                                                                                                                                                                                                                                    
CREATE TABLE IF NOT EXISTS permiso_rol (                                                                                                                                                                                            
    id_permiso_rol                  BIGINT    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,                                                                                                                                             
    id_rol                          INTEGER   NOT NULL REFERENCES rol(id_rol),                                                                                                                                                      
    id_modulo                       INTEGER   NOT NULL REFERENCES modulo(id_modulo),                                                                                                                                                
    puede_leer                      BOOLEAN   NOT NULL DEFAULT FALSE,                                                                                                                                                               
    puede_crear                     BOOLEAN   NOT NULL DEFAULT FALSE,                                                                                                                                                               
    puede_actualizar                BOOLEAN   NOT NULL DEFAULT FALSE,                                                                                                                                                               
    puede_eliminar                  BOOLEAN   NOT NULL DEFAULT FALSE,                                                                                                                                                               
    fecha_creacion_permiso_rol      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,                                                                                                                                                   
    fecha_actualizacion_permiso_rol TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,                                                                                                                                                   
    enabled                         BOOLEAN   NOT NULL DEFAULT TRUE,                                                                                                                                                                
    CONSTRAINT uk_permiso_rol_modulo UNIQUE (id_rol, id_modulo)                                                                                                                                                                     
);                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                    

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


4. Relación Roles × Módulos (Matriz de Permisos)                                                                                                                                                                                    

La siguiente tabla muestra los permisos predeterminados del sistema.                                                                                                                                                                
L = Leer, C = Crear, A = Actualizar, E = Eliminar, — = Sin acceso.                                                                                                                                                                  

                                                                                                                              
 Módulo \ Rol     ADMINISTRADOR  CO_ADMINISTRADOR  GESTOR_PEDIDOS  PROFESOR_A_CARGO  DOCENTE  ENCARGADO_BODEGA  ASISTENTE_BODEGA 
 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── 
 DASHBOARD                L C A E         L C A E             L                L             L            L                 L         
 INVENTARIO               L C A E         L C A E             —                —             —          L C A               —         
 SOLICITUD                L C A E         L C A E             —              L C A           L            —                 —         
 GESTION_PEDIDOS          L C A E         L C A E           L C A              —             —            —                 —         
 GESTION_SOLICITUDES      L C A E         L C A E           L C A              —             —            —                 —         
 CONGLOMERADO_PEDIDOS     L C A E         L C A E           L C A              —             —            —                 —         
 GESTION_PROVEEDORES      L C A E         L C A E             —                —             —            —                 —         
 BODEGA_TRANSITO          L C A E         L C A E             —                —             —            —                L C        
 GESTION_RECETAS          L C A E         L C A E             —                L             L            —                 —         
 GESTION_ACADEMICA        L C A E         L C A E             —                —             —            —                 —         
 GESTION_ROLES            L C A E            —                —                —             —            —                 —         
 GESTION_USUARIOS         L C A E          L C A              —                —             —            —                 —         
 ADMIN_SISTEMA            L C A E            —                —                —             —            —                 —         
                                                                                                                                      

▌ Esta matriz se obtiene dinámicamente mediante la consulta nativa findPermissionMatrix() en PermisoRolRepository.                                                                                                                

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


5. Flujo de Validación — Backend                                                                                                                                                                                                    

5.1 Arquitectura                                                                                                                                                                                                                    

                                                                                                                                                                                                                                    
Request HTTP                                                                                                                                                                                                                        
    │                                                                                                                                                                                                                               
    ▼                                                                                                                                                                                                                               
Controller (e.g. PermisoRolController)                                                                                                                                                                                              
    │                                                                                                                                                                                                                               
    ├─ Endpoints de LECTURA (GET) → Solo requieren autenticación (JWT válido)                                                                                                                                                       
    │                                                                                                                                                                                                                               
    └─ Endpoints de ESCRITURA (POST/PUT/DELETE)                                                                                                                                                                                     
           │                                                                                                                                                                                                                        
           ▼                                                                                                                                                                                                                        
       DynamicPermissionService.check(authentication, moduleCode, action)                                                                                                                                                           
           │                                                                                                                                                                                                                        
           ├─ Extrae el idRol del usuario autenticado (desde el JWT / SecurityContext)                                                                                                                                              
           │                                                                                                                                                                                                                        
           ├─ Consulta PermisoRolRepository.findByRolIdAndModuleCode(idRol, moduleCode)                                                                                                                                             
           │                                                                                                                                                                                                                        
           ├─ Evalúa el flag correspondiente según la acción:                                                                                                                                                                       
           │     "read"   → puedeLeer                                                                                                                                                                                               
           │     "write"  → puedeCrear OR puedeActualizar OR puedeEliminar                                                                                                                                                          
           │     "create" → puedeCrear                                                                                                                                                                                              
           │     "update" → puedeActualizar                                                                                                                                                                                         
           │     "delete" → puedeEliminar                                                                                                                                                                                           
           │                                                                                                                                                                                                                        
           └─ Retorna true/false → Controller responde 200 o 403 FORBIDDEN                                                                                                                                                          
                                                                                                                                                                                                                                    

5.2 Servicio de Permisos Dinámicos                                                                                                                                                                                                  

El servicio DynamicPermissionService es el único punto de verificación de permisos en el backend:                                                                                                                                   

 • No se usa @PreAuthorize con roles hardcodeados.                                                                                                                                                                                  
 • No se usan ROLE_ prefixes en Spring Security para lógica de módulos.                                                                                                                                                             
 • La verificación se hace en tiempo de ejecución contra la tabla permiso_rol.                                                                                                                                                      

5.3 Ejemplo de uso en un Controller                                                                                                                                                                                                 

                                                                                                                                                                                                                                    
@PostMapping("/upsert")                                                                                                                                                                                                             
public ResponseEntity<PermisoRolResponseDTO> upsert(                                                                                                                                                                                
        @Valid @RequestBody PermisoRolRequestDTO request,                                                                                                                                                                           
        Authentication authentication) {                                                                                                                                                                                            
    // Verificación dinámica contra BD                                                                                                                                                                                              
    if (!dynamicPermissionService.check(authentication, "GESTION_ROLES", "write")) {                                                                                                                                                
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();                                                                                                                                                                 
    }                                                                                                                                                                                                                               
    return ResponseEntity.ok(permisoRolService.upsertPermiso(request));                                                                                                                                                             
}                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                    

5.4 Endpoints principales                                                                                                                                                                                                           

                                                                          
 Método  Endpoint                                   Permiso requerido     
 ──────────────────────────────────────────────────────────────────────── 
 GET     /api/v1/permisos/matrix                    Autenticado           
 GET     /api/v1/permisos/rol/{idRol}               Autenticado           
 POST    /api/v1/permisos                           GESTION_ROLES → write 
 PUT     /api/v1/permisos/{id}                      GESTION_ROLES → write 
 POST    /api/v1/permisos/upsert                    GESTION_ROLES → write 
 POST    /api/v1/permisos/restaurar-predeterminado  GESTION_ROLES → write 
                                                                          

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


6. Flujo de Validación — Frontend                                                                                                                                                                                                   

6.1 Arquitectura                                                                                                                                                                                                                    

                                                                                                                                                                                                                                    
Login exitoso                                                                                                                                                                                                                       
    │                                                                                                                                                                                                                               
    ▼                                                                                                                                                                                                                               
permission-service.ts → GET /api/v1/permisos/rol/{idRol}                                                                                                                                                                            
    │                                                                                                                                                                                                                               
    ▼                                                                                                                                                                                                                               
permission-context.tsx → Almacena permisos en React Context                                                                                                                                                                         
    │                                                                                                                                                                                                                               
    ▼                                                                                                                                                                                                                               
protected-route.tsx → Valida acceso a rutas según permisos del módulo                                                                                                                                                               
    │                                                                                                                                                                                                                               
    ▼                                                                                                                                                                                                                               
Componentes de página → Consultan el contexto para mostrar/ocultar elementos                                                                                                                                                        
                                                                                                                                                                                                                                    

6.2 Archivos clave                                                                                                                                                                                                                  

                                                                                                        
 Archivo                                       Responsabilidad                                          
 ────────────────────────────────────────────────────────────────────────────────────────────────────── 
 frontend/src/services/permission-service.ts   Consulta los permisos del usuario autenticado al backend 
 frontend/src/contexts/permission-context.tsx  Provee los permisos a toda la app vía React Context      
 frontend/src/components/protected-route.tsx   Protege rutas verificando puedeLeer del módulo           
 frontend/src/types/permissions.types.ts       Define tipos e interfaces (PermisoRolRequestDTO, etc.)   
                                                                                                        

6.3 Gestión visual de roles y permisos                                                                                                                                                                                              

La administración de la matriz de permisos se realiza en:                                                                                                                                                                           

 • Vista: frontend/src/pages/gestion-roles.tsx                                                                                                                                                                                      
 • Helper: frontend/src/services/roles-helper.ts                                                                                                                                                                                    

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


7. Comportamiento de la UI según Nivel de Permiso                                                                                                                                                                                   

7.1 Permiso de LECTURA (puedeLeer = true, escritura = false)                                                                                                                                                                        

                                                                           
 Aspecto            Comportamiento                                                                                                                    
 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── 
 Visualización      ✅ El usuario puede ver toda la información del módulo                                                                            
 Peticiones HTTP    ✅ Solo puede ejecutar GET                                                                                                        
 POST para lectura  ✅ Permitido únicamente si el POST es necesario para obtener datos (ej: filtros complejos). Debe estar explícitamente documentado 
 Botones de acción  🚫 Deshabilitados (isDisabled={true}) o completamente ocultos                                                                     
 Formularios        🚫 Campos en modo readOnly o formulario no renderizado                                                                            
 Mensajes           ℹ️ Mostrar tooltip o badge indicando "Solo lectura"                                                                               
                                                                                                                                                      

7.2 Permiso de ESCRITURA (puedeCrear OR puedeActualizar OR puedeEliminar = true)                                                                                                                                                    

                                                                          
 Aspecto            Comportamiento                                        
 ──────────────────────────────────────────────────────────────────────── 
 Visualización      ✅ Acceso completo a la información                   
 Peticiones HTTP    ✅ GET, POST, PUT, DELETE según los flags específicos 
 Botones de acción  ✅ Habilitados y visibles                             
 Formularios        ✅ Editables                                          
 Comportamiento     Estándar, sin restricciones                           
                                                                          

7.3 SIN PERMISOS (todos los flags en false o sin registro)                                                                                                                                                                          

                                                                              
 Aspecto               Comportamiento                                             
 ──────────────────────────────────────────────────────────────────────────────── 
 Ruta/Navegación       🚫 protected-route.tsx redirige al Dashboard o muestra 403 
 Sidebar/Menú          🚫 El módulo no aparece en la navegación                   
 Acceso directo (URL)  🚫 Bloqueado por el guard de ruta                          
 Interacción           🚫 Nunca se permite interacción funcional                  
                                                                                  

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


8. Estructura de Archivos                                                                                                                                                                                                           

Backend (Java / Spring Boot)                                                                                                                                                                                                        

                                                                                                                                                                                                                                    
backend/src/main/java/KuHub/                                                                                                                                                                                                        
├── config/security/service/                                                                                                                                                                                                        
│   └── DynamicPermissionService.java        ← Verificación dinámica de permisos                                                                                                                                                    
│                                                                                                                                                                                                                                   
└── modules/gestion_usuario/                                                                                                                                                                                                        
    ├── entity/                                                                                                                                                                                                                     
    │   ├── Rol.java                         ← Entidad Rol                                                                                                                                                                          
    │   ├── Modulo.java                      ← Entidad Módulo                                                                                                                                                                       
    │   └── PermisoRol.java                  ← Entidad PermisoRol (junction Rol × Módulo)                                                                                                                                           
    │                                                                                                                                                                                                                               
    ├── repository/                                                                                                                                                                                                                 
    │   ├── RolRepository.java               ← Consultas de Rol                                                                                                                                                                     
    │   └── PermisoRolRepository.java        ← Consultas de PermisoRol + Matriz nativa                                                                                                                                              
    │                                                                                                                                                                                                                               
    ├── service/                                                                                                                                                                                                                    
    │   ├── RolService.java                  ← Interface de servicio Rol                                                                                                                                                            
    │   ├── RolServiceImpl.java              ← Implementación                                                                                                                                                                       
    │   ├── PermisoRolService.java           ← Interface de servicio PermisoRol                                                                                                                                                     
    │   └── PermisoRolServiceImpl.java       ← Implementación (CRUD + upsert + restaurar)                                                                                                                                           
    │                                                                                                                                                                                                                               
    ├── controller/                                                                                                                                                                                                                 
    │   ├── RolController.java               ← /api/v1/roles                                                                                                                                                                        
    │   ├── RolControllerV2.java             ← /api/v2/roles (HATEOAS)                                                                                                                                                              
    │   └── PermisoRolController.java        ← /api/v1/permisos                                                                                                                                                                     
    │                                                                                                                                                                                                                               
    └── dtos/                                                                                                                                                                                                                       
        ├── RolRequestDTO.java                                                                                                                                                                                                      
        ├── RolResponseDTO.java                                                                                                                                                                                                     
        ├── PermisoRolRequestDTO.java                                                                                                                                                                                               
        ├── PermisoRolResponseDTO.java                                                                                                                                                                                              
        └── PermisoMatrizDTO.java            ← Incluye getNivelAcceso()                                                                                                                                                             
                                                                                                                                                                                                                                    

Frontend (TypeScript / React)                                                                                                                                                                                                       

                                                                                                                                                                                                                                    
frontend/src/                                                                                                                                                                                                                       
├── contexts/                                                                                                                                                                                                                       
│   └── permission-context.tsx               ← React Context con permisos del usuario                                                                                                                                               
│                                                                                                                                                                                                                                   
├── components/                                                                                                                                                                                                                     
│   └── protected-route.tsx                  ← Guard de rutas por permisos                                                                                                                                                          
│                                                                                                                                                                                                                                   
├── services/                                                                                                                                                                                                                       
│   ├── permission-service.ts                ← Llamadas al backend de permisos                                                                                                                                                      
│   └── roles-helper.ts                      ← Helper para gestión de roles                                                                                                                                                         
│                                                                                                                                                                                                                                   
├── pages/                                                                                                                                                                                                                          
│   └── gestion-roles.tsx                    ← Vista de administración de roles y permisos                                                                                                                                          
│                                                                                                                                                                                                                                   
└── types/                                                                                                                                                                                                                          
    └── permissions.types.ts                 ← Tipos e interfaces (PermisoRolRequestDTO, ModuleKey)                                                                                                                                 
                                                                                                                                                                                                                                    

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


9. SQL de Referencia                                                                                                                                                                                                                

9.1 Inserción de Módulos                                                                                                                                                                                                            

                                                                                                                                                                                                                                    
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)                                                                                                                                   
VALUES                                                                                                                                                                                                                              
    ('DASHBOARD',            'Dashboard',                    'Panel principal con estadísticas y métricas',         'lucide:layout-dashboard', 1),                                                                                  
    ('INVENTARIO',           'Inventario',                   'Gestión de productos e inventario del sistema',       'lucide:package',          2),                                                                                  
    ('SOLICITUD',            'Solicitudes',                  'Creación y seguimiento de solicitudes de insumos',    'lucide:file-text',        3),                                                                                  
    ('GESTION_PEDIDOS',      'Gestión de Pedidos',           'Administración y seguimiento de pedidos',             'lucide:shopping-cart',    4),                                                                                  
    ('GESTION_SOLICITUDES',  'Gestión de Solicitudes',       'Administración de solicitudes del sistema',           'lucide:clipboard-list',   5),                                                                                  
    ('CONGLOMERADO_PEDIDOS', 'Conglomerado de Pedidos',      'Agrupación y consolidación de pedidos masivos',       'lucide:layers',           6),                                                                                  
    ('GESTION_PROVEEDORES',  'Gestión de Proveedores',       'Administración de proveedores del sistema',           'lucide:truck',            7),                                                                                  
    ('BODEGA_TRANSITO',      'Bodega de Tránsito',           'Control de productos en tránsito y despacho',         'lucide:warehouse',        8),                                                                                  
    ('GESTION_RECETAS',      'Gestión de Recetas',           'Administración de recetas y preparaciones culinarias','lucide:chef-hat',         9),                                                                                  
    ('GESTION_ACADEMICA',    'Gestión Académica',            'Administración de asignaturas y secciones',           'lucide:book-open',        10),                                                                                 
    ('GESTION_ROLES',        'Gestión de Roles',             'Administración de roles y permisos del sistema',      'lucide:shield',           11),                                                                                 
    ('GESTION_USUARIOS',     'Gestión de Usuarios',          'Administración de usuarios del sistema',              'lucide:users',            12),                                                                                 
    ('ADMIN_SISTEMA',        'Administración del Sistema',   'Centro de control: horarios, semanas y salas',        'lucide:settings',         13)                                                                                  
ON CONFLICT (codigo_modulo) DO NOTHING;                                                                                                                                                                                             
                                                                                                                                                                                                                                    

9.2 Permisos Predeterminados por Rol                                                                                                                                                                                                

ADMINISTRADOR — Acceso total                                                                                                                                                                                                        

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1),                                                                                                                                                            
    id_modulo,                                                                                                                                                                                                                      
    TRUE, TRUE, TRUE, TRUE                                                                                                                                                                                                          
FROM modulo                                                                                                                                                                                                                         
WHERE enabled = TRUE                                                                                                                                                                                                                
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer = TRUE, puede_crear = TRUE, puede_actualizar = TRUE, puede_eliminar = TRUE;                                                                                                                                      
                                                                                                                                                                                                                                    

CO_ADMINISTRADOR — Todo excepto Gestión de Roles y Admin del Sistema                                                                                                                                                                

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'CO_ADMINISTRADOR' LIMIT 1),                                                                                                                                                         
    m.id_modulo,                                                                                                                                                                                                                    
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA') THEN FALSE ELSE TRUE END,                                                                                                                                        
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA') THEN FALSE ELSE TRUE END,                                                                                                                                        
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA') THEN FALSE ELSE TRUE END,                                                                                                                                        
    CASE WHEN m.codigo_modulo IN ('GESTION_ROLES','ADMIN_SISTEMA','GESTION_USUARIOS') THEN FALSE ELSE TRUE END                                                                                                                      
FROM modulo m                                                                                                                                                                                                                       
WHERE m.enabled = TRUE                                                                                                                                                                                                              
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = EXCLUDED.puede_crear,                                                                                                                                                                                    
        puede_actualizar = EXCLUDED.puede_actualizar,                                                                                                                                                                               
        puede_eliminar   = EXCLUDED.puede_eliminar;                                                                                                                                                                                 
                                                                                                                                                                                                                                    

GESTOR_PEDIDOS — Dashboard + Pedidos + Solicitudes + Conglomerado                                                                                                                                                                   

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1),                                                                                                                                                           
    m.id_modulo,                                                                                                                                                                                                                    
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','GESTION_PEDIDOS','GESTION_SOLICITUDES','CONGLOMERADO_PEDIDOS') THEN TRUE ELSE FALSE END,                                                                                             
    CASE WHEN m.codigo_modulo IN ('GESTION_PEDIDOS','GESTION_SOLICITUDES','CONGLOMERADO_PEDIDOS') THEN TRUE ELSE FALSE END,                                                                                                         
    CASE WHEN m.codigo_modulo IN ('GESTION_PEDIDOS','GESTION_SOLICITUDES','CONGLOMERADO_PEDIDOS') THEN TRUE ELSE FALSE END,                                                                                                         
    FALSE                                                                                                                                                                                                                           
FROM modulo m                                                                                                                                                                                                                       
WHERE m.enabled = TRUE                                                                                                                                                                                                              
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = EXCLUDED.puede_crear,                                                                                                                                                                                    
        puede_actualizar = EXCLUDED.puede_actualizar,                                                                                                                                                                               
        puede_eliminar   = EXCLUDED.puede_eliminar;                                                                                                                                                                                 
                                                                                                                                                                                                                                    

PROFESOR_A_CARGO — Dashboard + Solicitud (crear/editar) + Recetas (lectura)                                                                                                                                                         

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR_A_CARGO' LIMIT 1),                                                                                                                                                         
    m.id_modulo,                                                                                                                                                                                                                    
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','SOLICITUD','GESTION_RECETAS') THEN TRUE ELSE FALSE END,                                                                                                                              
    CASE WHEN m.codigo_modulo IN ('SOLICITUD') THEN TRUE ELSE FALSE END,                                                                                                                                                            
    CASE WHEN m.codigo_modulo IN ('SOLICITUD') THEN TRUE ELSE FALSE END,                                                                                                                                                            
    FALSE                                                                                                                                                                                                                           
FROM modulo m                                                                                                                                                                                                                       
WHERE m.enabled = TRUE                                                                                                                                                                                                              
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = EXCLUDED.puede_crear,                                                                                                                                                                                    
        puede_actualizar = EXCLUDED.puede_actualizar,                                                                                                                                                                               
        puede_eliminar   = EXCLUDED.puede_eliminar;                                                                                                                                                                                 
                                                                                                                                                                                                                                    

DOCENTE — Dashboard + Solicitud (solo lectura) + Recetas (lectura)                                                                                                                                                                  

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'DOCENTE' LIMIT 1),                                                                                                                                                                  
    m.id_modulo,                                                                                                                                                                                                                    
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','SOLICITUD','GESTION_RECETAS') THEN TRUE ELSE FALSE END,                                                                                                                              
    FALSE, FALSE, FALSE                                                                                                                                                                                                             
FROM modulo m                                                                                                                                                                                                                       
WHERE m.enabled = TRUE                                                                                                                                                                                                              
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = FALSE,                                                                                                                                                                                                   
        puede_actualizar = FALSE,                                                                                                                                                                                                   
        puede_eliminar   = FALSE;                                                                                                                                                                                                   
                                                                                                                                                                                                                                    

ENCARGADO_BODEGA — Dashboard + Inventario (CRUD sin eliminar)                                                                                                                                                                       

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'ENCARGADO_BODEGA' LIMIT 1),                                                                                                                                                         
    m.id_modulo,                                                                                                                                                                                                                    
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','INVENTARIO') THEN TRUE ELSE FALSE END,                                                                                                                                               
    CASE WHEN m.codigo_modulo IN ('INVENTARIO') THEN TRUE ELSE FALSE END,                                                                                                                                                           
    CASE WHEN m.codigo_modulo IN ('INVENTARIO') THEN TRUE ELSE FALSE END,                                                                                                                                                           
    FALSE                                                                                                                                                                                                                           
FROM modulo m                                                                                                                                                                                                                       
WHERE m.enabled = TRUE                                                                                                                                                                                                              
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = EXCLUDED.puede_crear,                                                                                                                                                                                    
        puede_actualizar = EXCLUDED.puede_actualizar,                                                                                                                                                                               
        puede_eliminar   = EXCLUDED.puede_eliminar;                                                                                                                                                                                 
                                                                                                                                                                                                                                    

ASISTENTE_BODEGA — Dashboard + Bodega de Tránsito (lectura + crear)                                                                                                                                                                 

                                                                                                                                                                                                                                    
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
SELECT                                                                                                                                                                                                                              
    (SELECT id_rol FROM rol WHERE nombre_rol = 'ASISTENTE_BODEGA' LIMIT 1),                                                                                                                                                         
    m.id_modulo,                                                                                                                                                                                                                    
    CASE WHEN m.codigo_modulo IN ('DASHBOARD','BODEGA_TRANSITO') THEN TRUE ELSE FALSE END,                                                                                                                                          
    CASE WHEN m.codigo_modulo IN ('BODEGA_TRANSITO') THEN TRUE ELSE FALSE END,                                                                                                                                                      
    FALSE, FALSE                                                                                                                                                                                                                    
FROM modulo m                                                                                                                                                                                                                       
WHERE m.enabled = TRUE                                                                                                                                                                                                              
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = EXCLUDED.puede_crear,                                                                                                                                                                                    
        puede_actualizar = FALSE,                                                                                                                                                                                                   
        puede_eliminar   = FALSE;                                                                                                                                                                                                   
                                                                                                                                                                                                                                    

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


10. Guía para Agregar un Nuevo Permiso/Módulo                                                                                                                                                                                       

Paso 1 — Insertar el módulo en la BD                                                                                                                                                                                                

                                                                                                                                                                                                                                    
-- Ejemplo: Agregar módulo "REPORTES"                                                                                                                                                                                               
INSERT INTO modulo (codigo_modulo, nombre_modulo, descripcion_modulo, icono_modulo, orden_modulo)                                                                                                                                   
VALUES ('REPORTES', 'Reportes', 'Generación y visualización de reportes', 'lucide:bar-chart', 14)                                                                                                                                   
ON CONFLICT (codigo_modulo) DO NOTHING;                                                                                                                                                                                             
                                                                                                                                                                                                                                    

Paso 2 — Asignar permisos a los roles correspondientes                                                                                                                                                                              

                                                                                                                                                                                                                                    
-- Ejemplo: ADMINISTRADOR tiene acceso total, GESTOR_PEDIDOS solo lectura                                                                                                                                                           
INSERT INTO permiso_rol (id_rol, id_modulo, puede_leer, puede_crear, puede_actualizar, puede_eliminar)                                                                                                                              
VALUES                                                                                                                                                                                                                              
    ((SELECT id_rol FROM rol WHERE nombre_rol = 'ADMINISTRADOR' LIMIT 1),                                                                                                                                                           
     (SELECT id_modulo FROM modulo WHERE codigo_modulo = 'REPORTES'),                                                                                                                                                               
     TRUE, TRUE, TRUE, TRUE),                                                                                                                                                                                                       
    ((SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR_PEDIDOS' LIMIT 1),                                                                                                                                                          
     (SELECT id_modulo FROM modulo WHERE codigo_modulo = 'REPORTES'),                                                                                                                                                               
     TRUE, FALSE, FALSE, FALSE)                                                                                                                                                                                                     
ON CONFLICT (id_rol, id_modulo) DO UPDATE                                                                                                                                                                                           
    SET puede_leer       = EXCLUDED.puede_leer,                                                                                                                                                                                     
        puede_crear      = EXCLUDED.puede_crear,                                                                                                                                                                                    
        puede_actualizar = EXCLUDED.puede_actualizar,                                                                                                                                                                               
        puede_eliminar   = EXCLUDED.puede_eliminar;                                                                                                                                                                                 
                                                                                                                                                                                                                                    

Paso 3 — Registrar el ModuleKey en el frontend                                                                                                                                                                                      

Agregar 'REPORTES' al tipo ModuleKey en frontend/src/types/permissions.types.ts.                                                                                                                                                    

Paso 4 — Proteger la ruta en el frontend                                                                                                                                                                                            

Usar <ProtectedRoute moduleCode="REPORTES"> en el router.                                                                                                                                                                           

Paso 5 — Proteger los endpoints en el backend                                                                                                                                                                                       

                                                                                                                                                                                                                                    
if (!dynamicPermissionService.check(authentication, "REPORTES", "write")) {                                                                                                                                                         
    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();                                                                                                                                                                     
}                                                                                                                                                                                                                                   

Paso 6 - Localizacion en el frontend
Busca en frontend/src/:
    - permission-context.tsx — Contexto de permisos
    - permission-service.ts — Servicio que consulta permisos del usuario
    - protected-route.tsx — Validación de acceso a rutas                                                                                                                                                                                                                                    

Paso 7 — Documentar                                                                                                                                                                                                                 

Agregar el nuevo módulo a la Sección 2 (Definición de Módulos) y actualizar la Sección 4 (Matriz de Permisos) de este documento.                                                                                                    


