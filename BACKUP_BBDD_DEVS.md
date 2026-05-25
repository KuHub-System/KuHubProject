# Documentación del Sistema de Backup Automático de Base de Datos - KuHub

**Fecha de implementación:** 2026-05-25
**Estado:** Operativo
**Audiencia:** Equipo de desarrollo, docentes y evaluadores

---

## 1. Que es un backup y por que existe este sistema

Un backup es una copia de seguridad de la información almacenada en la base de datos. Su propósito es garantizar que, si ocurre algún problema técnico como fallo del servidor, error humano o pérdida de datos accidental, sea posible recuperar la información sin partir desde cero.

Este sistema realiza una copia automática de todos los datos de la base de datos de KuHub todos los días a las 3:00 AM, la guarda de forma comprimida y la envía a un servicio de almacenamiento en la nube (Google Drive) para que esté disponible desde cualquier lugar.

El horario de las 3:00 AM fue elegido porque es el momento de menor actividad del sistema, lo que asegura que el proceso no interfiera con el uso normal de la aplicación.

---

## 2. Informacion del entorno

El sistema de backup opera sobre los siguientes componentes de infraestructura:

| Componente | Descripcion |
|---|---|
| Servidor de base de datos | AWS Lightsail — Ubuntu 24.04 LTS — IP: 13.218.253.211 |
| Motor de base de datos | PostgreSQL 16.14 |
| Base de datos respaldada | kuhub_devs |
| Cuenta de almacenamiento | profesion#####@gmail.com (Google Drive) |
| Carpeta en Google Drive | KuHub_Backups_DEVS |
| Organizacion de carpetas | Subcarpeta por mes (ej: 2026_05, 2026_06) |

---

## 3. Herramientas utilizadas y que hace cada una

### pg_dump

Es la herramienta oficial de PostgreSQL para exportar datos. Cuando se ejecuta, lee toda la información de la base de datos y la escribe en un archivo de texto con formato SQL. Ese archivo contiene instrucciones para volver a insertar los datos en caso de ser necesario.

En este sistema se usa con la opción de solo datos, lo que significa que el archivo generado no incluye la definición de las tablas ni la estructura de la base de datos, solo los registros almacenados. Esto es suficiente para restaurar la información ya que la estructura de la base de datos se gestiona de forma separada por el equipo de desarrollo.

El archivo resultante tiene extension `.sql` y puede pesar entre 1 y 2 MB dependiendo del volumen de datos.

### zip

Es una herramienta de compresión de archivos, la misma que se usa habitualmente en Windows para crear archivos `.zip`. Se aplica sobre el archivo SQL generado por pg_dump para reducir su tamaño antes de subirlo a la nube. En las pruebas realizadas, la compresión redujo el archivo de 1.4 MB a 300 KB, lo que representa una reducción del 79%.

Una vez comprimido, el archivo SQL original es eliminado del servidor para liberar espacio en disco.

### rclone

Es una herramienta de sincronización de archivos con servicios en la nube. Funciona de forma similar a como lo haría arrastrar un archivo a Google Drive desde el navegador, pero de forma automática y desde la línea de comandos del servidor. Está autenticado con la cuenta de Google destinada a los backups y tiene permiso para escribir archivos en la carpeta `KuHub_Backups_DEVS`.

Cuando sube el archivo, rclone crea automáticamente la subcarpeta del mes correspondiente si no existe, por lo que no requiere intervención manual al inicio de cada mes.

### cron

Es el planificador de tareas del sistema operativo Linux. Funciona de forma similar al Programador de Tareas de Windows. Se configura una vez con una instrucción que indica que el script de backup debe ejecutarse todos los días a las 3:00 AM, y desde ese momento lo hace de forma automática sin necesidad de intervención humana.

---

## 4. Flujo completo del proceso

A continuacion se describe en orden cada paso que ocurre automaticamente cada dia a las 3:00 AM:

**Paso 1 — El planificador activa el proceso**

El sistema operativo del servidor detecta que son las 3:00 AM y ejecuta el script de backup de forma automática. Este es el único punto de inicio del proceso y no requiere que nadie esté conectado al servidor.

**Paso 2 — Exportacion de datos con pg_dump**

El script se conecta a la base de datos `kuhub_devs` usando las credenciales del usuario de base de datos y ejecuta pg_dump. Esta herramienta recorre todas las tablas de la base de datos y escribe su contenido en un archivo de texto SQL. El archivo se guarda en la carpeta `/backups/postgresql/` del servidor con un nombre que incluye la fecha y hora exacta, por ejemplo `kuhub_backup_2026-05-25_150034.sql`.

El nombre del archivo sigue el formato `kuhub_backup_AAAA-MM-DD_HHMMSS.sql`, donde AAAA es el año, MM el mes, DD el día, y HHMMSS la hora, minuto y segundo de ejecución.

**Paso 3 — Compresion del archivo**

Una vez generado el archivo SQL, el script lo comprime con zip creando un archivo `.zip` del mismo nombre. La compresión reduce el tamaño considerablemente, lo que acelera la transferencia a la nube y ahorra espacio de almacenamiento. Luego el archivo SQL original es eliminado, quedando solo el comprimido.

**Paso 4 — Transferencia a Google Drive**

El script utiliza rclone para subir el archivo ZIP a Google Drive en la cuenta `profesion#####@gmail.com`. El archivo es guardado dentro de la carpeta `KuHub_Backups_DEVS`, organizado en una subcarpeta del mes en curso. Por ejemplo, los backups de mayo de 2026 quedan en `KuHub_Backups_DEVS/2026_05/`.

**Paso 5 — Limpieza de archivos locales antiguos**

Para evitar que el disco del servidor se llene con el tiempo, el script elimina automáticamente todos los archivos ZIP almacenados localmente que tengan más de 7 días de antigüedad. Los archivos en Google Drive no son afectados por esta limpieza y permanecen disponibles indefinidamente.

**Paso 6 — Registro en el log**

Cada uno de los pasos anteriores queda registrado en un archivo de log ubicado en `/backups/postgresql/backup.log`. Este archivo permite verificar que el proceso se ejecutó correctamente y en qué momento ocurrió cada acción. Si algo falla, el log indica exactamente en qué paso ocurrió el error.

---

## 5. Estructura de archivos en el servidor

Los archivos del sistema de backup están organizados de la siguiente manera en el servidor:

```
/backup-setup/
    backup-postgresql.sh     Script principal que ejecuta todo el proceso

/backups/postgresql/
    backup.log               Historial de todas las ejecuciones del backup
    *.zip                    Copias locales de los ultimos 7 dias

/home/ubuntu/.config/rclone/
    rclone.conf              Credenciales de conexion con Google Drive (acceso restringido)
```

---

## 6. Estructura de carpetas en Google Drive

Los archivos de backup se organizan en Google Drive de la siguiente manera:

```
KuHub_Backups_DEVS/
    2026_05/
        kuhub_backup_2026-05-25_150034.zip
        kuhub_backup_2026-05-26_030000.zip
        ...
    2026_06/
        kuhub_backup_2026-06-01_030000.zip
        ...
```

Cada subcarpeta corresponde a un mes. Los archivos dentro contienen la fecha y hora exacta en que fueron generados.

---

## 7. Como verificar que el backup funciono

Para confirmar que el backup del dia anterior se ejecuto correctamente, hay dos formas de verificarlo:

**Opcion A — Revisar el log desde el servidor**

Conectarse al servidor de base de datos por SSH y ejecutar el siguiente comando para ver las ultimas lineas del historial:

```bash
tail -30 /backups/postgresql/backup.log
```

Si el proceso fue exitoso, la ultima linea de cada ejecucion dira:

```
[2026-05-25 15:00:37] BACKUP COMPLETADO EXITOSAMENTE
```

Si hubo un error, aparecera la palabra `ERRO` seguida de una descripcion del problema.

**Opcion B — Verificar directamente en Google Drive**

Acceder a Google Drive con la cuenta `profesion#####@gmail.com` y navegar a la carpeta `KuHub_Backups_DEVS`. Dentro de la subcarpeta del mes actual debe aparecer un archivo ZIP con la fecha del dia anterior.

---

## 8. Como restaurar los datos desde un backup

En caso de necesitar recuperar los datos, el proceso es el siguiente:

1. Descargar el archivo ZIP desde Google Drive correspondiente a la fecha deseada
2. Descomprimir el archivo para obtener el archivo con extension `.sql`
3. Conectarse a la base de datos mediante pgAdmin o psql
4. Ejecutar el siguiente comando indicando la ruta donde se encuentra el archivo SQL:

```sql
\i 'C:/ruta/donde/descomprimiste/kuhub_backup_2026-05-25_150034.sql'
```

Este comando lee el archivo y ejecuta todas las instrucciones de insercion de datos que contiene, restaurando la informacion en la base de datos.

**Importante:** La restauracion inserta los datos sobre la estructura existente. Si la base de datos tiene datos actuales, deben limpiarse antes de restaurar para evitar duplicados. Este paso debe ser coordinado con el equipo de desarrollo.

---

## 9. Programacion automatica — detalle del scheduler

El sistema utiliza `cron`, el planificador nativo de Linux, configurado con la siguiente instruccion:

```
0 3 * * *
```

Cada parte de esta instruccion tiene un significado:

| Campo | Valor | Significado |
|---|---|---|
| Minuto | 0 | En el minuto 0 (exactamente en punto) |
| Hora | 3 | A las 3 de la madrugada |
| Dia del mes | * | Cualquier dia del mes |
| Mes | * | Cualquier mes |
| Dia de la semana | * | Cualquier dia de la semana |

En conjunto, significa: ejecutar el script todos los dias a las 3:00 AM sin excepcion.

La instruccion completa registrada en el servidor es:

```
0 3 * * * /bin/bash /backup-setup/backup-postgresql.sh >> /backups/postgresql/backup.log 2>&1
```

Lo que dice es: a las 3:00 AM, ejecutar el script ubicado en `/backup-setup/backup-postgresql.sh` y guardar todo lo que imprima en el archivo de log.

---

## 10. Seguridad y confidencialidad

Los siguientes elementos contienen informacion sensible y estan protegidos con permisos de acceso restringido en el servidor:

| Elemento | Descripcion | Proteccion |
|---|---|---|
| Script de backup | Contiene credenciales de la base de datos | Solo el usuario del sistema puede leerlo y ejecutarlo |
| Archivo de credenciales rclone | Contiene el token de autenticacion con Google Drive | Solo el usuario del sistema puede leerlo |
| Cuenta de Google Drive | Cuenta destinada exclusivamente a recibir backups | Credenciales no publicadas en este documento |

Este documento publico no incluye contrasenas ni tokens. Los valores sensibles estan almacenados unicamente en el servidor de base de datos con los permisos adecuados.

---

## 11. Datos de la primera ejecucion de prueba

El sistema fue probado manualmente el dia 2026-05-25 con los siguientes resultados:

| Dato | Valor |
|---|---|
| Hora de ejecucion | 15:00:34 UTC |
| Tamano del archivo SQL generado | 1.4 MB |
| Tamano del archivo ZIP comprimido | 300 KB |
| Reduccion por compresion | 79% |
| Tiempo de transferencia a Google Drive | 1.8 segundos |
| Nombre del archivo generado | kuhub_backup_2026-05-25_150034.zip |
| Ubicacion en Google Drive | KuHub_Backups_DEVS/2026_05/ |

La prueba fue exitosa en todas sus etapas.

---

## 12. Resumen del estado actual

| Componente | Estado |
|---|---|
| Exportacion de datos con pg_dump | Operativo |
| Compresion ZIP | Operativo |
| Transferencia a Google Drive con rclone | Operativo |
| Planificacion automatica diaria a las 3:00 AM | Operativo |
| Registro de actividad en log | Operativo |
| Limpieza automatica de archivos locales antiguos | Operativo |

---

**Proyecto:** KuHub — Sistema de Gestion Gastronomica DuocUC
**Responsable:** Equipo de desarrollo
**Ultima actualizacion:** 2026-05-25
