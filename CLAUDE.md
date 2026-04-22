# CLAUDE.md — Guía de convenciones globales KuHub

Este archivo define reglas que aplican a **todo el proyecto** (frontend y backend).
Para convenciones específicas del backend, ver también `backend/CLAUDE.md`.

---

## 1. Versión del sistema — actualización obligatoria al hacer deploy

Cada vez que se sube una nueva tag de deploy, **se deben actualizar los dos archivos
siguientes** con el número de versión exacto de la tag antes de generar el build:

| Archivo | Línea a modificar |
|---|---|
| `frontend/src/layouts/auth-layout.tsx` | `© {new Date().getFullYear()} KuHub · Entorno de Pruebas \| v1.0.8` |
| `frontend/src/components/footer.tsx`   | `© {new Date().getFullYear()} KuHub · Entorno de Pruebas \| v1.0.8` |

Ejemplo: si la tag del deploy es `K1.0.9`, ambas líneas deben quedar:
```
© {new Date().getFullYear()} KuHub · Entorno de Pruebas | v1.0.9
```

El año se calcula automáticamente con `new Date().getFullYear()` — no se toca.

### Convención de tags de deploy

Una tag por día, mismo número todo el día (no incrementar por commit).
Formato: `K<mayor>.<menor>.<parche>` — ejemplo: `K1.0.8`

Flujo de deploy:
```bash
git add <archivos>
git commit -m "mensaje"
git push
git tag K1.0.X
git push origin K1.0.X
```

---

## 2. Indicador de entorno de pruebas

El texto **"Entorno de Pruebas"** debe mantenerse en el footer mientras el sistema
no esté en producción oficial. Cuando el cliente pase a producción, reemplazar por:
```
© {new Date().getFullYear()} KuHub · Sistema de Gestión Gastronómica DuocUC | v1.0.X
```

---

## 3. Copyright en el formulario de login

El copyright **dentro** de la tarjeta del formulario (`login.tsx`, línea del `CardBody`)
usa `new Date().getFullYear()` y no requiere cambio manual. No modificar ese texto.

---

## 4. Sincronización de documentos de alcance

Cada vez que se agrega o modifica algo en `nota_alcance`, marcar el ítem con la etiqueta
**(MODIFICAR INFORME)** al final de la línea o bloque modificado.

Esta etiqueta es el recordatorio para actualizar manualmente el DOCX formal del cliente:
`E:\Dev_Codes\K\DOCS\Informes\informe_alcance_kuhub_v1.0.3.docx`

Herramienta disponible: `python-docx` (instalado).
