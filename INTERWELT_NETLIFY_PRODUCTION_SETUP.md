# INTERWELT — conectar contraseña nueva en Netlify Free (solo operador)

El sitio **interwelt-api-test** es un proyecto aislado de ViajeroLatam.com. Se puede probar la cotización privada **sin activar compras ni vouchers** y sin cambiar la rama `main`.

## 1. Crear o actualizar las variables desde Netlify

Abrir:
https://app.netlify.com/projects/interwelt-api-test/configuration/env

En **Project configuration → Environment variables** usar **Add a variable** o editar la existente. En Netlify Free, las variables del proyecto se almacenan fuera del repositorio, cifradas por Netlify y están disponibles para Functions, aunque no se puedan limitar los *scopes* específicos como en Pro. **No escribir contraseñas en archivos HTML/JS, GitHub, chats, código, capturas ni logs.**

| Key | Valor / regla |
|---|---|
| `INTERWELT_EMAIL` | El correo autorizado por INTERWELT |
| `INTERWELT_PASSWORD` | La contraseña **nueva** facilitada por el proveedor; no utilizar la anterior |
| `INTERWELT_CONTACT_EMAIL` | Correo de contacto técnico autorizado que se envía en el JSON de cotización |
| `INTERWELT_CONTACT_PHONE` | Teléfono de contacto técnico autorizado |
| `INTERWELT_PILOT_TOKEN` | Valor largo y aleatorio exclusivo para autorizar las pruebas privadas, distinto de la contraseña del proveedor; **mínimo 32 bytes aleatorios** |
| `INTERWELT_PILOT_ENABLED` | Primero `false`; poner `true` únicamente durante una prueba consciente del operador |
| `INTERWELT_API_URL` | `https://apisea.interwelt-intl.com` (sin `/api` final) |
| `INTERWELT_CONFIRMED_CURRENCY` | **NO CONFIGURAR** hasta que INTERWELT confirme por escrito la moneda de los importes |

En Free, los roles con acceso a las variables de entorno podrían leerlas: restringir el acceso del equipo. Si la opción `Contains secret values` está disponible, activarla; si la UI requiere pago, no usar códigos en el cliente como alternativa. Una variable de entorno de Netlify **no equivale** a un gestor de secretos con acceso restringido.

Para `INTERWELT_PILOT_TOKEN`, generar un valor criptográficamente aleatorio en un administrador de contraseñas, guardarlo de forma segura y copiarlo únicamente en la variable de Netlify y en el cliente privado de prueba. Evitar incluirlo en URL, código o capturas.

Al guardar las variables, ir a **Deploys → Trigger deploy → Deploy project** para que Netlify actualice las funciones.

## 2. Verificar conexión del piloto SIN contactar a INTERWELT

Solicitar desde Postman, Insomnia o una herramienta HTTP local:

```http
GET https://deploy-preview-1--interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote?check=1
x-pilot-token: [token privado, introducir solo en cliente local]
```

Devuelve únicamente indicadores booleanos: `credentials_configured`, `live_quotes_enabled`, `currency_confirmed`, `payments_enabled:false` y `vouchers_enabled:false`. **No devuelve credenciales ni precios.** Sin el token responde 403.

## 3. Primera cotización real de solo lectura

Solo después de verificar que los IDs numéricos de Colombia y la región Europa/Mediterráneo son correctos en el **catálogo de PRODUCCIÓN**, y de acordar que está permitida una prueba real:

1. Cambiar `INTERWELT_PILOT_ENABLED` a `true` en Netlify y redeploy.
2. Desde Postman realizar:

```http
POST https://deploy-preview-1--interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote
content-type: application/json
x-pilot-token: [token privado del operador]
```

Cuerpo **ILUSTRATIVO, NO EJECUTAR sin validar los IDs**:

```json
{
  "origin_country_id": 48,
  "destination_region_id": 2,
  "ages": [30],
  "departure": "2026-11-01",
  "return": "2026-11-15"
}
```

Los números `48` y `2` proceden de ejemplos del entorno anterior y **no están aún verificados contra producción**. Corroborar sus equivalencias en `GET /api/countries?status=1` y `GET /api/destinations?status=1` (con paginación) usando la documentación autorizada del proveedor.

El operador recibirá `mode:"operator_quote"`, `live:true`, `prices`, `currency:null` mientras no esté confirmada, `mapping_verified:false` y `payments_enabled:false`, `vouchers_enabled:false`. Los precios **no aparecerán en el comparador público**.

3. Tras terminar, volver a dejar `INTERWELT_PILOT_ENABLED=false` y volver a desplegar.

## 4. Antes de tarifas para visitantes

- Confirmar moneda, divisa de venta y posibles tasas.
- Confirmar equivalencias oficiales de país/región para cada ruta, alcance, límites de edad y exclusiones.
- Implementar un endpoint público con cuotas/caché/antibots; jamás enviar `x-pilot-token`, credenciales o JWT al navegador.
- Confirmar si el JSON de cotización crea algún registro comercial persistente, aunque no emita vouchers.
- Comprobar el coste en la cuota de funciones gratuitas y añadir controles contra abuso.
- La denominación aprobada por INTERWELT es **Asistencia en Viaje**, no seguro.
- No habilitar pagos y emisión hasta confirmar verificación del pago en servidor y prevención de duplicados.

## Documentación Netlify

- https://docs.netlify.com/build/functions/environment-variables/
- https://docs.netlify.com/build/environment-variables/overview/
