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
