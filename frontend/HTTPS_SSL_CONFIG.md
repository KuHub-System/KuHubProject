# Configuración HTTPS / SSL — KuHub

## Resumen

El servidor de producción de KuHub opera con **HTTPS habilitado mediante un certificado SSL autofirmado (self-signed)**,
generado directamente en el servidor sin necesidad de un dominio registrado.

---

## Arquitectura de red

```
Usuario (browser)
        │
        │  HTTPS :443  (cifrado TLS)
        ▼
┌─────────────────────────────────────────────┐
│          HOST Ubuntu — 52.5.222.79          │
│                                             │
│   Nginx (proxy reverso)                     │
│   ├── :80  → redirect 301 a :443            │
│   └── :443 → proxy a localhost:3000         │
│                                             │
│   ┌───────────────────────────────────┐     │
│   │  Docker Network (kuhub-app)       │     │
│   │                                   │     │
│   │  kuhub-frontend  127.0.0.1:3000   │     │
│   │    └─ /api/* → backend:8080       │     │
│   │                                   │     │
│   │  kuhub-backend   127.0.0.1:8080   │     │
│   └───────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

**Puntos clave:**
- Los contenedores Docker **solo escuchan en localhost** (`127.0.0.1`), no son accesibles desde Internet directamente.
- Solo nginx expone los puertos 80 y 443 al mundo exterior.
- El proxy `/api/*` ocurre dentro de la red Docker (sin salir al exterior).

---

## El certificado SSL

### ¿Qué es un certificado autofirmado?

Un certificado SSL normal es emitido por una **Autoridad Certificadora (CA)** de confianza global (como Let's Encrypt,
DigiCert, etc.). Esas CAs solo emiten certificados para **dominios registrados**, verificando que el solicitante
controla el dominio.

Un certificado autofirmado es generado por nosotros mismos: es técnicamente idéntico en estructura y capacidad de
cifrado, pero no tiene el respaldo de una CA reconocida. Por eso el browser muestra una advertencia la primera vez.

### Cómo fue generado

```bash
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/kuhub.key \
  -out    /etc/nginx/ssl/kuhub.crt \
  -subj   '/C=US/ST=State/L=City/O=Kuhub/CN=52.5.222.79' \
  -addext 'subjectAltName=IP:52.5.222.79'
```

| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| `-days 3650` | 10 años | Válido hasta ~2036 |
| `-newkey rsa:2048` | RSA 2048 bits | Clave privada de 2048 bits |
| `CN=52.5.222.79` | IP del servidor | Common Name para la IP |
| `subjectAltName=IP:...` | SAN para IP | Extensión moderna que asocia el cert a la IP |

Archivos en el servidor:
- **Certificado:** `/etc/nginx/ssl/kuhub.crt`
- **Clave privada:** `/etc/nginx/ssl/kuhub.key`

---

## ¿Qué cifra exactamente?

Con HTTPS activo, todo el tráfico entre el usuario y el servidor viaja **cifrado**:

| Datos cifrados | Ejemplo |
|----------------|---------|
| Credenciales de login | usuario y contraseña |
| Tokens JWT / sesiones | headers de autorización |
| Datos de formularios | cualquier POST con información |
| Respuestas de la API | JSON con datos del sistema |
| URLs y parámetros | incluso la ruta `/api/...` |
| Cookies | tokens de sesión |

Sin HTTPS (HTTP puro), todo lo anterior viajaba en **texto plano** y podía ser leído por cualquiera en la red
intermedia (ISP, router comprometido, ataque man-in-the-middle).

---

## Protocolo TLS configurado

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers   HIGH:!aNULL:!MD5;
```

- **TLS 1.2 y 1.3:** Los dos protocolos modernos y seguros. TLS 1.0 y 1.1 están deshabilitados (vulnerables).
- **HIGH ciphers:** Solo algoritmos de cifrado de alta seguridad.
- **!aNULL:** Elimina cifrados sin autenticación.
- **!MD5:** Elimina el algoritmo MD5 (roto hace años).

---

## ¿Qué NO protege este esquema?

| Limitación | Explicación |
|------------|-------------|
| Advertencia del browser | Al ser autofirmado, Chrome/Firefox muestran "Conexión no privada". El usuario debe aceptar manualmente. |
| Sin validación de identidad | Un certificado de CA acredita que el servidor es quien dice ser. El autofirmado no tiene esa acreditación externa. |
| Vulnerable a MITM en primer acceso | Si alguien intercepta la primera conexión antes de que el usuario acepte el cert, podría presentar su propio cert falso. Con un cert de CA esto no es posible porque el browser lo rechaza. |
| Sin HSTS efectivo | HTTP Strict Transport Security requiere que el cert sea de confianza para funcionar correctamente. |

> **Contexto:** Para un sistema interno o de uso conocido, estas limitaciones son aceptables.
> Los datos viajan cifrados. El riesgo real de MITM requiere que el atacante esté en la misma
> red o controle infraestructura intermedia — no aplica a ataques remotos comunes.

---

## Ataques que SÍ bloquea este esquema

### Sniffing / escucha de red
Un atacante que capture el tráfico de red (Wireshark, tcpdump) solo verá datos cifrados ilegibles.
Sin la clave privada del servidor (que solo existe en `/etc/nginx/ssl/kuhub.key`), no puede descifrarlos.

### Inyección de datos en tránsito
TLS verifica la integridad de cada paquete con HMAC. Cualquier modificación del tráfico en tránsito
hace que la conexión falle inmediatamente.

### Replay attacks básicos
TLS usa números de secuencia únicos por sesión. Un paquete capturado no puede ser "repetido" en otra sesión.

### Exposición de puertos internos
Los contenedores Docker ahora solo escuchan en `127.0.0.1`. Un escaneo externo de puertos no verá
el backend en 8080 ni el frontend en 3000 — solo 80 y 443 de nginx.

---

## Renovación / mantenimiento

El certificado autofirmado fue generado con validez de **10 años** (hasta ~2036), por lo que no requiere
renovación periódica a diferencia de los certificados de Let's Encrypt (que expiran cada 90 días).

Para renovarlo manualmente cuando sea necesario:

```bash
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/kuhub.key \
  -out    /etc/nginx/ssl/kuhub.crt \
  -subj   '/C=US/ST=State/L=City/O=Kuhub/CN=52.5.222.79' \
  -addext 'subjectAltName=IP:52.5.222.79'
sudo systemctl reload nginx
```

---

## Migración a HTTPS con dominio (futuro)

Si en algún momento se registra un dominio para KuHub, el proceso para obtener un certificado gratuito y
confiable con **Let's Encrypt** sería:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d kuhub.com -d www.kuhub.com
```

Certbot configura nginx automáticamente y renueva el certificado cada 60 días. Con esto desaparece la
advertencia del browser y el certificado pasa a ser reconocido globalmente.

---

## Archivos relevantes en el servidor

| Ruta | Descripción |
|------|-------------|
| `/etc/nginx/ssl/kuhub.crt` | Certificado SSL público |
| `/etc/nginx/ssl/kuhub.key` | Clave privada SSL (no compartir) |
| `/etc/nginx/sites-enabled/kuhub` | Config nginx activa |
| `/home/ubuntu/kuhub-app/docker-compose.yml` | Compose con puertos internos |
| `/home/ubuntu/kuhub-app/docker-compose.yml.bak` | Backup del compose anterior (HTTP) |

---

*Configurado el 2026-04-01 — Servidor AWS Lightsail us-east-1*
