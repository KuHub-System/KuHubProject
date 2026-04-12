# Configuración SSL — Kuhub (appkuhub.questweb.cl)

**Autor:** Alumno desarrollador  
**Entorno:** Pruebas (AWS Lightsail)  
**Fecha de configuración:** 2026-04-11  
**Dominio:** `appkuhub.questweb.cl`  
**Servidor:** AWS Lightsail — Ubuntu, IP estática `52.5.222.79`

---

## Contexto

Durante el desarrollo inicial de la aplicación Kuhub, se configuró HTTPS en el servidor utilizando un **certificado SSL auto-firmado (self-signed)**. Esta solución fue adoptada como medida temporal para habilitar el protocolo HTTPS mientras se avanzaba en el desarrollo, sin depender de un dominio validado externamente.

Sin embargo, un certificado auto-firmado no es reconocido por ninguna Autoridad Certificadora (CA) de confianza, por lo que los navegadores muestran una advertencia de **"Sitio no seguro"** o **"Conexión no privada"**, lo cual no es aceptable para un entorno accesible por usuarios o evaluadores.

---

## Problema: Certificado Auto-Firmado (Configuración temporal)

### ¿Qué era?

Un certificado auto-firmado es generado por el propio servidor sin intervención de una CA reconocida. Se usó durante la etapa inicial del proyecto para los siguientes fines:

- Habilitar HTTPS en el servidor de forma rápida sin tener un dominio configurado aún.
- Permitir probar el cifrado en tránsito entre el cliente y el servidor durante el desarrollo.
- Evitar el tráfico HTTP plano mientras se definía la infraestructura definitiva.

### Ubicación del certificado auto-firmado (reemplazado)

```
/etc/nginx/ssl/kuhub.crt   ← certificado auto-firmado
/etc/nginx/ssl/kuhub.key   ← clave privada auto-firmada
```

### Limitaciones que motivaron el cambio

| Problema | Descripción |
|---|---|
| Advertencia en navegadores | Chrome, Firefox y Safari bloquean o advierten al usuario |
| No confiable por defecto | No está firmado por ninguna CA reconocida mundialmente |
| No apto para evaluación | Evaluadores o usuarios externos ven el sitio como inseguro |
| No profesional | Indica que la infraestructura no está completamente configurada |

---

## Solución Implementada: Let's Encrypt con Certbot

### ¿Por qué Let's Encrypt?

[Let's Encrypt](https://letsencrypt.org/) es una Autoridad Certificadora gratuita, automatizada y reconocida mundialmente. Sus certificados son aceptados por todos los navegadores modernos sin advertencias. Es la solución estándar para entornos de prueba y producción de pequeña escala donde no se cuenta con presupuesto para certificados comerciales.

**Ventajas para este entorno:**

- Gratuito, sin costo asociado
- Reconocido por todos los navegadores (Chrome, Firefox, Safari, Edge)
- Renovación automática cada 90 días configurada por Certbot
- No requiere cambios en el código de la aplicación
- Compatible con nginx como reverse proxy

---

## Arquitectura del Servidor

```
Internet (HTTPS :443)
        |
      nginx  ← reverse proxy con certificado Let's Encrypt
        |
   ┌────┴────┐
   |         |
Frontend   Backend
(Docker    (Docker
 :3000)     :8080)
```

El servidor corre dos contenedores Docker:

| Contenedor | Imagen                                | Puerto interno |
|---|---------------------------------------|---|
| `kuhub-frontend` | `martorias/kuhub-app:frontend-K1.0.4` | `127.0.0.1:3000` |
| `kuhub-backend` | `martorias/kuhub-app:backend-K1.0.4`  | `127.0.0.1:8080` |

nginx actúa como reverse proxy expuesto al exterior en los puertos 80 (redirige a HTTPS) y 443 (HTTPS con certificado válido).

---

## Proceso de Implementación

### 1. Instalación de Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### 2. Obtención del Certificado

Se utilizó el modo `--standalone` con hooks para detener nginx temporalmente durante la validación HTTP-01 de Let's Encrypt:

```bash
sudo certbot certonly --standalone \
  -d appkuhub.questweb.cl \
  --non-interactive \
  --agree-tos \
  --email admin@questweb.cl \
  --pre-hook 'systemctl stop nginx' \
  --post-hook 'systemctl start nginx'
```

**Resultado:**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/appkuhub.questweb.cl/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/appkuhub.questweb.cl/privkey.pem
This certificate expires on 2026-07-09.
```

### 3. Actualización de la Configuración de nginx

Se reemplazó la referencia al certificado auto-firmado por los certificados de Let's Encrypt:

```nginx
server {
    listen 80;
    server_name appkuhub.questweb.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name appkuhub.questweb.cl;

    ssl_certificate     /etc/letsencrypt/live/appkuhub.questweb.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/appkuhub.questweb.cl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

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

### 4. Recarga de nginx y Verificación

```bash
sudo nginx -t        # validar configuración
sudo systemctl restart nginx

# verificación desde el propio servidor:
curl -sI https://appkuhub.questweb.cl/login
# → HTTP/1.1 200 OK
```

---

## Estado Actual del Certificado

| Campo                   | Valor |
|-------------------------|---|
| Sub # 1. Guardar y subir los cambios del workflow
git add .
git commit -m "Sub dominio implementado y tema claro por defecto"
git push
# 2. Borrar posibles tags viejos o erróneos
git tag -d K1.0.5
git push origin --delete K1.0.5
# 3. Crear el nuevo Tag con el formato K
git tag K1.0.5
# 4. ¡FUEGO!
git push origin K1.0.5Dominio             | `appkuhub.questweb.cl` |
| Emisor                  | Let's Encrypt (ISRG Root X1) |
| Tipo                    | DV (Domain Validated) |
| Válido desde            | 2026-04-11 |
| Expira                  | 2026-07-09 |
| Renovación automática   | Configurada por Certbot (systemd timer) |
| Ubicación fullchain     | `/etc/letsencrypt/live/appkuhub.questweb.cl/fullchain.pem` |
| Ubicación clave privada | `/etc/letsencrypt/live/appkuhub.questweb.cl/privkey.pem` |

---

## Renovación Automática

Certbot configura automáticamente un timer de systemd que renueva el certificado antes de su vencimiento. No requiere intervención manual. Se puede verificar con:

```bash
sudo systemctl status snap.certbot.renew.timer
# o bien
sudo certbot renew --dry-run
```

---

## Comparación: Auto-firmado vs Let's Encrypt

| Criterio | Auto-firmado (temporal) | Let's Encrypt (actual) |
|---|---|---|
| Reconocido por navegadores | No | Si |
| Advertencia de seguridad | Si | No |
| Costo | Gratuito | Gratuito |
| Requiere dominio | No | Si |
| Renovación | Manual | Automática (cada 90 días) |
| Apto para evaluación | No | Si |
| Nivel de confianza | Ninguno | CA reconocida mundialmente |

---

## Notas Finales

> Este entorno es de **pruebas académicas** administrado por el alumno desarrollador del proyecto Kuhub. La configuración implementada con Let's Encrypt es viable, profesional y suficiente para el ciclo de vida del proyecto en su etapa actual.
>
> Para un entorno de **producción comercial** a futuro, se recomienda evaluar certificados con validación extendida (EV) o de organización (OV), y considerar el uso de **AWS Certificate Manager (ACM)** junto a un **Application Load Balancer (ALB)** para mayor disponibilidad y escalabilidad.
