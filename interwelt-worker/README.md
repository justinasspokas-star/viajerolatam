# INTERWELT · Cotizador privado de ViajeroLatam (borrador)

## Estado

**Solo piloto de lectura y cotización. NO está conectado a la web, NO acepta pagos y NO emite vouchers.** La web actual es estática (GitHub Pages), de modo que la contraseña/JWT de INTERWELT nunca debe incluirse en HTML, JavaScript cliente, archivos públicos ni commits.

Este código propone un Cloudflare Worker independiente que contacta con `POST /api/auth/login` y `POST /api/quotes` del proveedor, y devuelve exclusivamente identificadores, nombres y precios de los planes. El endpoint de pruebas `POST /api/quote` está **desactivado por defecto** y protegido por `x-pilot-token`. Este token es solo para uso desde terminal/Postman privado, **nunca desde el navegador público**. No hay endpoint de vouchers.

## Antes de desplegar

1. Pedir a Yeicar que cambie la contraseña expuesta en capturas anteriores y revoque tokens anteriores.
2. Confirmar por escrito que el entorno de producción utiliza USD para `montoVenta_detalle`; el JSON de cotización no incluye moneda. La propuesta comercial expresa tarifas en USD, pero conviene validar correspondencia.
3. Confirmar que los IDs de países/regiones siguen siendo correctos en producción, el producto/ámbito por país y las condiciones de SOMOS EUROPA* para Schengen.
4. Confirmar permiso para realizar cotizaciones de ensayo en producción usando **contactos propios reales/autorizados** (cada `POST /api/quotes` registra una cotización en el proveedor).
5. Preparar un dominio/backend, protección anti-bots y un mecanismo válido de consentimiento e información sobre tratamiento de datos antes de habilitar consultas públicas.
6. Completar el sistema de pagos: verificación **server-side** del cobro y, más adelante, un flujo seguro de emisión con registro y prevención de duplicados. **No activar emisiones con este piloto.**

## Configuración manual (cuando se apruebe)

Requisitos: Node.js y acceso propio a Cloudflare Workers.

```bash
cd interwelt-worker
npm install
npm test
npx wrangler login
npx wrangler secret put INTERWELT_EMAIL
npx wrangler secret put INTERWELT_PASSWORD
npx wrangler secret put INTERWELT_CONTACT_EMAIL
npx wrangler secret put INTERWELT_CONTACT_PHONE
npx wrangler secret put INTERWELT_PILOT_TOKEN
```

En `wrangler.toml`, cambiar `INTERWELT_PILOT_ENABLED` a `"true"` **solo durante las pruebas privadas controladas** y desplegar con `npm run deploy`. Para volver a desactivarlo, cambiar a `"false"` y desplegar otra vez. No configurar `INTERWELT_CONFIRMED_CURRENCY=USD` hasta recibir confirmación expresa de la moneda de respuesta.

### Probar sin datos reales de viajeros

Generar un token de operador largo y aleatorio, almacenarlo solo como secreto (no en un script público). Luego desde un cliente privado:

```bash
curl -sS -X POST "https://<YOUR-WORKER>.workers.dev/api/quote" \
  -H "Content-Type: application/json" \
  -H "x-pilot-token: <PRIVATE_PILOT_TOKEN>" \
  --data '{
    "origin_country_id": 48,
    "destination_region_id": 2,
    "ages": [30],
    "departure": "2026-11-01",
    "return": "2026-11-15"
  }'
```

Los campos `origin_country_id` y `destination_region_id` son IDs de INTERWELT que requieren comprobación previa. Los contactos remitidos al proveedor proceden exclusivamente de los secretos de operador, no de un visitante web.

### Respuesta

```json
{
  "quote_id": 123,
  "prices": [{ "id": 205, "name": "ESTELAR", "total": 48 }],
  "currency": null,
  "currency_confirmed": false,
  "vouchers_enabled": false
}
```

Esta respuesta es solo ilustrativa. El precio real se consulta dinámicamente. No mostrar información como cotización contratada ni disponibilidad garantizada hasta completar las verificaciones.

## Integración pública posterior

No reutilizar el token de piloto en `fetch()` del frontend: sería visible al visitante. Diseñar primero una ruta pública con validación estricta, limitación de velocidad/bot protection, controles de elegibilidad, política de privacidad, errores sin filtración de datos y conversión/moneda verificadas. Mantener `/resultados/` sin indexación y conservar enlaces afiliados existentes hasta que la nueva oferta esté lista.

Actualmente el código no implementa pagos, datos personales del cliente, compra, cancelación, emisión, webhooks ni reembolsos.
