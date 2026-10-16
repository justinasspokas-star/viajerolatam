# INTERWELT API · Piloto con Netlify (sin cobros ni emisiones)

**Estado:** borrador en rama `feature/interwelt-readonly-pilot-20261016`. No está integrado en la web pública, ni desplegado, ni activado.

## Para qué sirve

- Un `GET /.netlify/functions/interwelt-quote` ofrece un chequeo sin secretos.
- Un `POST /.netlify/functions/interwelt-quote` hace una cotización para un operador autorizado **solo si** se activa explícitamente y se aporta un token privado.
- En el servidor se autentica con INTERWELT y consulta `/api/quotes`.
- No hay venta, Stripe, ni emisión de vouchers. La moneda queda sin declarar hasta confirmación adicional.
- Sin acceso `x-pilot-token` válido, devuelve 403; si no se ha activado, devuelve 503. Sin CORS público.

## Requisito previo urgente

La contraseña y al menos un token JWT aparecieron en capturas compartidas. Pide a Yeicar que **revoque los tokens y cree otra contraseña** antes de habilitar el piloto. No copies contraseñas a ChatGPT, a GitHub ni al código del navegador.

## Elegir ubicación en Netlify

**Opción A — Hay un proyecto ViajeroLatam conectado al mismo repositorio**:

- Confirmar el nombre del proyecto y que `Base directory` sea la raíz del repositorio.
- Netlify detecta `netlify/functions/` por defecto. Comprueba que no se haya cambiado la carpeta `Functions directory`.
- Cuando se apruebe y fusione el PR, será necesario desplegar esa versión.
- La función continuará desactivada hasta añadir secretos y cambiar `INTERWELT_PILOT_ENABLED`.

**Opción B — ViajeroLatam sigue alojado en GitHub Pages y Netlify solo está disponible como cuenta**:

- Crear un nuevo proyecto Netlify conectado al repositorio, dedicado **únicamente** al piloto de API, separado de la web pública. No conectar dominio `viajerolatam.com` ni sustituir DNS.
- En la configuración de despliegue, usar **Base directory** vacía (raíz), **Build command** vacío y **Publish directory** `interwelt-pilot-site`.
- Netlify debe seguir usando **Functions directory** `netlify/functions` (valor predeterminado).
- No activar todavía ninguna interfaz o consulta de clientes reales.

## Variables de entorno necesarias (Project configuration > Environment variables)

Crear en la interfaz de Netlify; en planes que soporten scopes, incluir **Functions** para las variables. No ponerlas en `netlify.toml`.

| Nombre | Qué contiene |
|---|---|
| `INTERWELT_EMAIL` | Usuario de producción confirmado |
| `INTERWELT_PASSWORD` | Contraseña de producción **renovada** |
| `INTERWELT_CONTACT_EMAIL` | Correo propio/autorizado para las pruebas |
| `INTERWELT_CONTACT_PHONE` | Teléfono propio/autorizado para las pruebas |
| `INTERWELT_PILOT_TOKEN` | Cadena aleatoria larga, distinta de la contraseña de INTERWELT |
| `INTERWELT_PILOT_ENABLED` | Dejar sin crear o configurar como `false` hasta autorización |
| `INTERWELT_API_URL` (opcional) | Por defecto `https://apisea.interwelt-intl.com`, no incluye `/api` |
| `INTERWELT_CONFIRMED_CURRENCY` (opcional) | No crear hasta que Yeicar confirme que los importes API son USD |

## Cómo comprobar que está correctamente desplegado

1. Con la función ya desplegada en Netlify, abrir `https://<site>.netlify.app/.netlify/functions/interwelt-quote` en el navegador. Debe devolver `{"status":"ok","mode":"readonly","vouchers_enabled":false}`.
2. Si `POST` sin activación devuelve `503`, está protegido como previsto.
3. Solo con credenciales renovadas, permiso para registrar cotizaciones de prueba y token privado, configurar `INTERWELT_PILOT_ENABLED=true`, redeplegar y probar con un cliente privado (no navegador público).
4. Confirmar IDs 48 (Colombia) y 2 (Europa/Mediterráneo), moneda, elegibilidad, requisitos del producto para Schengen. La API `POST /api/quotes` **registra** una cotización real en el proveedor.

Petición JSON de prueba (operator-only):

```json
{
  "origin_country_id": 48,
  "destination_region_id": 2,
  "ages": [30],
  "departure": "2026-11-01",
  "return": "2026-11-15"
}
```

La respuesta simplificada contiene `quote_id`, `prices`, `currency` (nula hasta confirmar) y `vouchers_enabled: false`.

## Antes de conectarlo al frontend del comparador

Este piloto **no es un endpoint público**. No colocar `INTERWELT_PILOT_TOKEN` en una petición `fetch` del navegador: los visitantes podrían verlo y generar cotizaciones a costa del sitio.

Para producción pública es imprescindible crear un flujo distinto con límites de tasa, control de abuso, validación de usuarios/consentimiento, tratamiento de datos, elegibilidad por país y edad, estado del pago verificado en servidor y emisión idempotente de voucher. No activar las compras hasta tener aprobación comercial y técnica.
