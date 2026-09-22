# DECOMISION_INSTANCIA_PROD.md — Baja del servidor de Producción KuHub

**Fecha de la decisión:** 2026-09-22
**Fecha de ejecución (instancia eliminada):** 2026-09-22
**Instancia afectada:** AWS Lightsail Producción — IP `18.209.52.224` (24 USD/mes)
**Motivo:** La aplicación no está siendo utilizada por el cliente. Se cancela el servicio para dejar de pagar la instancia mientras no haya uso confirmado.
**Entorno de Pruebas (`K*.*.*`):** No afectado por esta baja — sigue siendo un servidor aparte (ver `docs/infraestructura/CONFIGURATION_HOST_DEVS.md`).
**Estado:** ✅ Instancia eliminada. La IP `18.209.52.224` ya no responde.

---

## 1. Qué se está dando de baja

| Recurso | Detalle |
|---|---|
| Instancia Lightsail | IP estática `18.209.52.224` — 4 GB RAM / 2 vCPU / 80 GB SSD — Ubuntu 24.04 LTS — 24 USD/mes |
| Contenedores Docker | `kuhub-frontend` (puertos 80/443) y `kuhub-backend` (puerto 8080 interno) |
| PostgreSQL 17 | Nativo en el host (sin Docker) — DB `kuhub_prod_db`, usuario `kuhub_prod` |
| Dominio apuntado | `web-kuhub.questweb.cl` / `www.web-kuhub.questweb.cl` → `18.209.52.224` (SSL nunca llegó a activarse) |
| Trigger de deploy | Tags `PK*.*.*` en GitHub Actions (`.github/workflows/deploy-prod.yml`) |

La configuración completa de esta instancia (topología, memoria, SSL, troubleshooting) queda documentada tal como estaba en [`CONFIGURATION_HOST_PROD.MD`](./CONFIGURATION_HOST_PROD.MD) — ese archivo se mantiene como referencia histórica y queda marcado como decomisionado en su encabezado.

---

## 2. Estado al momento de la baja

- El sistema **nunca llegó a activar HTTPS** (certificado Let's Encrypt pendiente desde 2026-06-28).
- El deploy se disparaba manualmente vía tag `PK*.*.*`; no hay evidencia de tráfico/uso real reportado por el cliente.
- Backup de la base de datos de producción corriendo por cron diario (3:00 AM) hacia Google Drive, carpeta `KuHub_Backups_PROD` (mismo mecanismo que `BACKUP_BBDD_DEVS.md`, réplica del script en `/backup-setup/` del servidor prod).

---

## 3. Checklist de la baja del servicio

- [x] Detener/eliminar la instancia Lightsail `18.209.52.224` desde la consola AWS (esto es lo que corta el cobro de 24 USD/mes). — **Ejecutado 2026-09-22.**
- [ ] Confirmar que el último backup automático (3:00 AM) subió correctamente a `gdrive:KuHub_Backups_PROD/` antes de la eliminación (verificar retroactivamente en Drive).
- [ ] Quitar o dejar en desuso el apuntamiento DNS de `web-kuhub.questweb.cl` / `www.web-kuhub.questweb.cl` (Questweb) hacia la IP eliminada.
- [ ] Revisar los GitHub Secrets asociados (`PROD_AWS_REMOTE_HOST`, `PROD_MASTER_KEY`, `PROD_JWT_SECRET`) — quedan inertes mientras no exista servidor, no es obligatorio borrarlos pero conviene dejar anotado que apuntan a una instancia que ya no existe.
- [ ] No pushear tags `PK*.*.*` hasta que exista un nuevo servidor de producción (el workflow `deploy-prod.yml` fallaría al intentar conectarse por SSH a una IP que ya no responde).

> Los pasos marcados como completados se van tildando manualmente en este mismo archivo a medida que se ejecutan.

---

## 4. Qué queda preservado (no se pierde nada al dar de baja el servidor)

- **Backups de la BD** en Google Drive (`KuHub_Backups_PROD`, subcarpetas mensuales), independientes del servidor.
- **Código y configuración de deploy** en el repo: `docker-compose.prod.yml`, `.github/workflows/deploy-prod.yml`, `VARIABLES_BY_HOST_PROD.MD`.
- **Documentación completa de la arquitectura** que tenía el servidor: `docs/infraestructura/CONFIGURATION_HOST_PROD.MD`.

Nada de esto se elimina con esta baja — solo se apaga/borra la instancia de cómputo en AWS.

---

## 5. Cómo reactivar producción en el futuro (si el cliente confirma uso)

1. Crear una nueva instancia Lightsail (misma spec: 4 GB RAM / 2 vCPU / 80 GB SSD, Ubuntu 24.04) o restaurar desde el snapshot tomado en el paso opcional del checklist.
2. Seguir la configuración documentada en `CONFIGURATION_HOST_PROD.MD` (PostgreSQL 17 nativo, Docker, `pg_hba.conf`, firewall) y `VARIABLES_BY_HOST_PROD.MD` (secrets, `.env`).
3. Restaurar la base de datos desde el último backup en `gdrive:KuHub_Backups_PROD/`.
4. Actualizar el GitHub Secret `PROD_AWS_REMOTE_HOST` con la nueva IP (si cambió) y reinstalar `PROD_MASTER_KEY` con la nueva llave SSH.
5. Volver a apuntar el DNS de `web-kuhub.questweb.cl` a la nueva IP.
6. Pushear un tag `PK*.*.*` para disparar el primer deploy.

---

**Última actualización:** 2026-09-22 — Instancia Lightsail eliminada. Quedan pendientes solo los pasos de limpieza (DNS, secrets).
