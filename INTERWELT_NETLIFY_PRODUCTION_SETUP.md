# INTERWELT — piloto privado de cotizaciones (Netlify Pro)

Entorno aislado: **interwelt-api-test**. No fusionar la rama piloto con `main` hasta completar validación de seguridad y cotizaciones. Las tarjetas públicas existentes en ViajeroLatam.com no se modifican.

## Datos de la API confirmados por INTERWELT (20-10-2026)

- `POST /api/quotes`: `montoVenta` y `tarifa_detalle` son importes **finales en USD**, sin campo de moneda ni desglose impositivo.
- Orígenes `id_paisOrigen`: Colombia `48`, Perú `173`, México `142`, España `207`, Estados Unidos `233`.
- Destinos `id_destino`: Europa/Mediterráneo `2` (incluye España/Schengen), Norteamérica `6`, Latinoamérica/Caribe `3`.
- Mostrar **únicamente** productos devueltos en `plans`; el proveedor filtra la elegibilidad por origen, destino, edades, duración y canal.
- Fecha de salida y regreso se cuentan **ambas** para el número de días.
- `correo` y `telefono` son obligatorios para cotización; INTERWELT autoriza usar los datos corporativos configurados.
- JWT de login: duración **60 minutos**. El backend lo reutiliza durante **50 minutos por instancia caliente** y renueva ante HTTP 401. No es una caché compartida entre instancias.
- **Confirmado en Swagger de producción el 20-10-2026**: login `POST /api/auth/login`, cuerpo `{"username":"<usuario>","password":"<contraseña>"}`, con respuesta JSON que contiene `token`. La variable `INTERWELT_EMAIL` del servidor se envía como `username` al autenticar. No confundirlo con `correo`, que sí corresponde al endpoint de cotización. La prueba manual en Swagger dio HTTP 200; verificar por separado el backend con su variable secreta rotada.

## Variables de Netlify

Abrir https://app.netlify.com/projects/interwelt-api-test/configuration/env

| Variable | Configuración |
|---|---|
| `INTERWELT_EMAIL` | Correo de acceso privado autorizado por el proveedor |
| `INTERWELT_PASSWORD` | Contraseña de producción actual, secreta |
| `INTERWELT_CONTACT_EMAIL` | Correo corporativo para cotizaciones |
| `INTERWELT_CONTACT_PHONE` | Teléfono corporativo para cotizaciones |
| `INTERWELT_PILOT_TOKEN` | Token de operador aleatorio, secreto |
| `INTERWELT_PILOT_ENABLED` | Mantener en `false` hasta autorizar explícitamente una cotización real |
| `INTERWELT_API_URL` | Opcional; por defecto `https://apisea.interwelt-intl.com` |

En Netlify Pro restringir **contraseña** y **token** a `Contains secret values`, `Functions` y contexto `Production`. **No copiar secretos a GitHub, JavaScript del navegador, capturas, URLs, logs ni chats**. La moneda `USD` ya está confirmada en el código, sin requerir una variable de entorno adicional.

## Prueba 1: configuración (no contacta a INTERWELT)

Con el token original disponible en la variable local PowerShell `$token`:

```powershell
Invoke-RestMethod -Method Get -Uri "https://interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote?check=1" -Headers @{"x-pilot-token"=$token}
```

Se espera `credentials_configured: True`, `currency_confirmed: True`, `live_quotes_enabled: False`, `payments_enabled: False` y `vouchers_enabled: False`. La comprobación **no verifica la aceptación real de credenciales**.

## Prueba 2: autenticación real, sin crear cotización

Endpoint privado añadido para comprobar únicamente el login; **no llama `/api/quotes` ni emite vouchers**. No requiere activar `INTERWELT_PILOT_ENABLED`.

```powershell
Invoke-RestMethod -Method Post -Uri "https://interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote?auth_check=1" -Headers @{"x-pilot-token"=$token}
```

Respuesta de éxito: `mode: operator_auth_check`, `authenticated: True`, `quotes_submitted: False`, `payments_enabled: False`, `vouchers_enabled: False`.

Si `authenticated: false`, la respuesta incluye un `failure_code` genérico, exclusivamente para el operador: `login_path_not_found` (404), `login_payload_rejected` (400/422), `login_not_authorized` (401/403), `login_token_not_recognized` (respuesta sin JWT reconocido), `login_rate_limited` (429), `login_timeout`, `login_provider_http_error` o `login_network_or_format_error`. La prueba de diagnóstico devuelve HTTP 200 para que PowerShell muestre el resultado incluso cuando la autenticación falla. **Esto no implica éxito**; hay que leer `authenticated`. Nunca revela el cuerpo de respuesta del proveedor, contraseñas, tokens ni los detalles de las excepciones. No cambiar la contraseña ni asumir la ruta de login correcta sin revisar la documentación Swagger.

## Prueba 3: una única cotización de operador, solo después de validar login

`INTERWELT_PILOT_ENABLED` debe mantenerse en `false` hasta que el operador confirme que está de acuerdo con registrar una cotización en INTERWELT. Cuando se autorice la prueba, cambiar temporalmente a `true` solo en Production y redeploy.

```http
POST https://interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote
content-type: application/json
x-pilot-token: [introducir localmente, nunca publicar]
```

Ejemplo autorizado de IDs y fechas futuras de muestra:

```json
{
  "origin_country_id": 48,
  "destination_region_id": 2,
  "ages": [30],
  "departure": "2026-11-01",
  "return": "2026-11-15"
}
```

`/api/quotes` puede registrar un identificador de cotización aunque **no cobre ni emita un voucher**. Dejar la funcionalidad deshabilitada de nuevo al terminar.

## Antes de mostrar precios a visitantes

- Crear un endpoint **público** independiente con limitación de solicitudes, controles antiabuso, validación y caché adecuada. No enviar JWT ni token de operador al navegador.
- Mostrar únicamente `plans` devueltos por INTERWELT en cada consulta, con total **USD** y coberturas verificadas en la ficha real de producto.
- Revisar condiciones, exclusiones y denominación comercial autorizada: **Asistencia en Viaje**.
- Contratación y vouchers no están implementados ni habilitados. No fusionar el PR con `main` hasta completar estas medidas.

Documentación Netlify: https://docs.netlify.com/build/functions/environment-variables/


## Fase de integración del comparador: preflight de ruta (sin cotizar)

La rama de pruebas implementa `POST /.netlify/functions/interwelt-quote?route_check=1` exclusivamente para el entorno aislado `interwelt-api-test`. El navegador envía únicamente origen ISO abreviado, destino, fechas y edades; no envía correo, teléfono, contraseña ni token. La misma validación de tamaño, tipo JSON y origen que `?prepare=1` sigue aplicándose.

Rutas numéricas confirmadas por INTERWELT:
- Colombia `co` → `48`; Perú `pe` → `173`; México `mx` → `142`.
- España/Europa `espana-schengen`, `espana`, `europa` → región `2`.
- Estados Unidos/Norteamérica `eeuu`, `eeuu-canada` → región `6`.

Las demás rutas se aceptan como búsqueda general pero devuelven `route_supported: false`, `mapping_verified: false` y `provider_route: null`, evitando adivinar los IDs.

La respuesta `mode: "route_mapping_preview"` presenta `currency: "USD"` solo para rutas confirmadas y **siempre** devuelve `live: false`, `rates_available: false`, `prices: []`, `eligible: null`, `payments_enabled: false` y `vouchers_enabled: false`. Un mapa de ruta válido **no equivale** a un plan elegible o un precio cotizado.

La vista previa de `/resultados/` consume este endpoint, muestra un único bloque INTERWELT con sus datos de demostración histórica si coincide exactamente con el ejemplo fijo, y no revela credenciales ni dispara cotizaciones de producción. La rama `main` sigue sin cambios.

El adaptador de Netlify incluye una **regla propuesta** de límite de 10 solicitudes por IP/dominio cada 60 segundos para el endpoint del piloto. Verificar su aceptación en el registro de despliegue → **Post-processing**: Netlify puede completar el despliegue aunque descarte una regla inválida. Según Netlify, su aplicación puede tardar hasta 10 segundos. Esto **no es** una cuota global ni limita el número de IP diferentes.

**Pendiente antes de conectar la API a visitantes:** protección distribuida y **límite global de gasto/uso** (además del control por IP), caché de precios con TTL e invalidación, prevención de duplicados entre instancias, verificación del esquema de `plans` y elegibilidad por origen/edad, rotación de contraseña expuesta, políticas de datos/contacto y consentimiento del proveedor para generar registros con tráfico público. No establecer `INTERWELT_PILOT_ENABLED=true` para servir cotizaciones al público: ese flag pertenece solo a pruebas privadas del operador.


## Backend compartido de cotizaciones (implementado, apagado)

Se añadió `interwelt-worker/public-rates.mjs` y un gateway independiente:
`POST /.netlify/functions/interwelt-quote?public_rates=1`.

**IMPORTANTE: el gateway público NO está habilitado ni debe habilitarse aún.** No depende de `INTERWELT_PILOT_ENABLED`, sino de la variable separada `INTERWELT_PUBLIC_RATES_ENABLED`, que por defecto no existe y equivale a `false`. Incluso si el piloto privado del operador estuviera en `true`, esto no activa el gateway público. No habilitar ninguna opción en Netlify ahora.

El nuevo flujo está preparado para trabajar con **Upstash Redis REST**, como almacén compartido entre funciones serverless, pero todavía no hay conexión Redis real verificada. Para utilizarlo posteriormente se requerirían estos secretos server-side:
- `UPSTASH_REDIS_REST_URL`: dirección HTTPS de la base de datos Upstash Redis.
- `UPSTASH_REDIS_REST_TOKEN`: token REST de Redis; marcar secreto y permitir **Functions/Production** exclusivamente.
- `INTERWELT_PUBLIC_RATES_ENABLED`: **mantener en `false`** hasta las validaciones finales y nueva autorización explícita.

Implementación: preflight con origen, fechas, edades y ruta confirmada; lectura de caché de 600 s; bloqueo distribuido `SET NX EX` de 90 s para evitar dos registros simultáneos idénticos; incremento atómico `EVAL` de un cupo global conservador de **20 nuevas cotizaciones al día**, compartido por todas las IP; almacenamiento de precios en USD sin ID de cotización y sin datos de contacto. Se mantiene el bloqueo de 90 s ante fallos ambiguos para prevenir reintentos automáticos que puedan duplicar registros.

Si faltan los secretos de Redis, hay un problema de conexión o la ruta no ha sido confirmada, el gateway responde sin consultar a INTERWELT. El frontend continúa con `LIVE_ENABLED=false` y no consume ese endpoint; las demás tarjetas de afiliados permanecen intactas.

Las pruebas automáticas usan una simulación de Redis y un proveedor falso. **No demuestran que Upstash real acepte aún las operaciones `EVAL` ni que haya una base de datos conectada**. La regla Netlify de 10 peticiones por IP y minuto es complementaria, no una cuota global.

### Pendientes antes de lanzar

1. Rotar la contraseña de producción mostrada en una captura anterior, y revocar el JWT expuesto.
2. Configurar Upstash REST solo en Netlify Functions/Production y verificar operaciones de Redis con una prueba sin conexión al proveedor.
3. Revisar retención de fechas y edades y la política de privacidad.
4. Validar la cobertura, elegibilidad y el texto legal de cada plan, sin inferir beneficios de los IDs.
5. Obtener aprobación expresa de INTERWELT para cotizaciones con tráfico público y definir el presupuesto de llamadas.
6. Activar inicialmente en un entorno aislado después de confirmar caché/cupo; **no** fusionar el PR a `main` ni establecer `INTERWELT_PUBLIC_RATES_ENABLED=true` antes de todo lo anterior.


## Upstash ya configurado: prueba privada de Redis sin cotizaciones

Después de guardar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` como variables `Functions` en `Production`, es necesario desplegar de nuevo el sitio aislado `interwelt-api-test`.

El nuevo endpoint `POST /.netlify/functions/interwelt-quote?redis_check=1` exige el mismo token de operador `x-pilot-token` que la comprobación privada de INTERWELT. **Funciona solo cuando `INTERWELT_PILOT_ENABLED` y `INTERWELT_PUBLIC_RATES_ENABLED` están desactivados**. No llama al proveedor y no requiere activar ninguno de los dos flags.

Con el token de operador ya disponible en la variable local de PowerShell `$token`:

```powershell
Invoke-RestMethod -Method Post -Uri "https://interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote?redis_check=1" -Headers @{"x-pilot-token"=$token}
```

La comprobación utiliza dos claves efímeras aleatorias y confirma:
- `SET NX EX` y `GET` de caché;
- `EVAL` con el mismo script Lua del cupo global;
- `DEL` de ambas claves. Cada clave tiene un TTL máximo de 60 segundos por seguridad.

Respuesta esperada: `redis_connected: True`, `read_write_ok: True`, `atomic_quota_ok: True`, `temporary_keys_cleaned: True`, `provider_contacted: False`, `quotes_submitted: False`, `payments_enabled: False`, `vouchers_enabled: False`. Esta prueba no modifica el límite real diario ni registra cotizaciones. Un error devuelve una respuesta genérica sin secretos ni claves.

**No divulgar el token de operador ni el token REST en capturas o chats.** El token REST normal de Upstash necesita permisos de escritura. El de solo lectura no sirve para el control de cuota.

La prueba de Redis **no implica autorización para mostrar cotizaciones públicas**. El gateway público permanece desactivado y separado del piloto privado.
