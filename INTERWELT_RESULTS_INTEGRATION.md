# Integración INTERWELT en `/resultados/` — fase preparada (no publicada)

## Estado

El código de integración ya está en la rama `feature/interwelt-readonly-pilot-20261016`, **no está fusionado en `main`**. No afecta a `viajerolatam.com` ni cambia afiliados IATI, InterMundial, Holins, AXA, Chapka o Assist 365.

Se han añadido:
- `resultados/index.html`: slot `#vl-interwelt-slot` después de `#cards-container`, oculto por defecto.
- `assets/vl-interwelt-results.js`: pide edades de todos los viajeros, detecta cambios en la búsqueda y muestra tarjetas históricas solo bajo bandera interna.
- `assets/vl-interwelt-results.css`: tarjetas adaptadas a móvil.
- Función previa Netlify `interwelt-quote` sin credenciales reales y con piloto desactivado.

## Cómo abrir la vista previa real de resultados en Netlify

```text
/resultados/?origen=co&destino=espana-schengen&ida=2026-11-01&vuelta=2026-11-15&personas=1&vl_interwelt_preview=1
```

El módulo pedirá la edad. Solo introduciendo `30` mostrará **los cinco importes históricos** del ejemplo correspondiente. Otra edad, origen, destino o fechas mostrarán «no hay una cotización real ni histórica» sin inventar precios. Esta vista interna no hace solicitudes de red a INTERWELT ni permite compras.

**Ruta ya publicada en el despliegue de prueba:** https://deploy-preview-1--interwelt-api-test.netlify.app/resultados/?origen=co&destino=espana-schengen&ida=2026-11-01&vuelta=2026-11-15&personas=1&vl_interwelt_preview=1

La build aislada utiliza `interwelt-worker/build-results-preview.mjs`, copia solo la página de resultados y sus recursos al directorio del laboratorio y elimina la carga de Google Analytics. La vista incluye una banda de advertencia y bloquea clics a enlaces externos de venta. La demo original de laboratorio sigue disponible en la raíz de Netlify. **Esto NO publica ningún cambio en viajerolatam.com ni modifica la rama principal.**

## Antes de poner INTERWELT en los resultados de todos los usuarios

1. Netlify Function con usuario y contraseña de producción guardados sin revelar, y protección frente a abuso. No almacenar contraseñas o tokens en `assets/*.js`, HTML ni en `netlify.toml`.
2. **No** usar `?demo=1` en la web pública. El endpoint público deberá devolver exclusivamente precios calculados para la búsqueda realizada, con un eco del origen/destino/fechas/edades y condiciones de elegibilidad verificadas.
3. Un contrato de servidor como este (ilustrativo, NO un resultado real):

```json
{
  "mode":"live",
  "source":"INTERWELT",
  "currency":"USD",
  "currency_confirmed":true,
  "eligible":true,
  "payments_enabled":false,
  "vouchers_enabled":false,
  "search":{
    "origin":"co",
    "destination":"europe",
    "departure":"2026-11-01",
    "return":"2026-11-15",
    "ages":[30]
  },
  "prices":[{"id":205,"name":"ESTELAR","total":48}]
}
```

El navegador **solo** podrá pintar la tarifa si coinciden exactamente los datos de la búsqueda y si la moneda, elegibilidad, nombre e importe están verificados. El interruptor interno `LIVE_ENABLED` permanece en `false`. El código no realiza actualmente peticiones a este endpoint; se conectará cuando exista uno real y seguro.

4. Falta confirmar con INTERWELT los IDs por país y región en producción, el ámbito de cobertura por residencia, límites según edades, divisa y la duración facturable. En la página actual la duración suele calcularse como diferencia de fechas (sin incluir regreso), mientras que el ejemplo de INTERWELT del 1 al 15 de noviembre fue registrado para 15 días naturales inclusivos: normalizar esta diferencia antes de vender.
5. La web pública puede estar alojada en hosting distinto del subdominio de pruebas de Netlify. Hacen falta una ruta de API propia bajo el dominio del comparador o una configuración de dominio/CORS estricta. **Jamás** colocar una clave privada en `fetch` público.
6. Verificar Stripe/pago en servidor y emitir vouchers solo después de cobro confirmado, con protección frente a duplicados. Ni pagos ni vouchers forman parte de este paso.

## Comprobaciones realizadas

- Parseo de `assets/vl-interwelt-results.js`: válido.
- Normalización de destino España/Schengen y EE. UU./Canadá: comprobada.
- Fechas válidas/invalidas: comprobadas.
- HTML contiene slot oculto y referencias al JS/CSS.
- Afiliados existentes conservados.
- Cero llamadas de red en el módulo, `LIVE_ENABLED=false`.
- Netlify Deploy Preview de la rama: **Success**. La compilación ahora también publica la copia aislada de `/resultados/` en el sitio de laboratorio. Se requiere revisión visual manual de los resultados.
