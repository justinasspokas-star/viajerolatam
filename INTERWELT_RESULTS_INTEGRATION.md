# Integración INTERWELT en `/resultados/` — fase preparada (no publicada)

## Estado

El código de integración ya está en la rama `feature/interwelt-readonly-pilot-20261016`, **no está fusionado en `main`**. No afecta a `viajerolatam.com` ni cambia afiliados IATI, InterMundial, Holins, AXA, Chapka o Assist 365.

Se han añadido:
- `resultados/index.html`: slot `#vl-interwelt-slot` después de `#cards-container`, oculto por defecto.
- `assets/vl-interwelt-results.js`: pide edades de todos los viajeros, detecta cambios en la búsqueda y muestra tarjetas históricas solo bajo bandera interna.
- `assets/vl-interwelt-results.css`: tarjetas adaptadas a móvil.
- Función previa Netlify `interwelt-quote` sin credenciales reales y con piloto desactivado.

## Cómo ver la posición en un servidor de pruebas que sirva la raíz del repositorio

```text
/resultados/?origen=co&destino=espana-schengen&ida=2026-11-01&vuelta=2026-11-15&personas=1&vl_interwelt_preview=1
```

El módulo pedirá la edad. Solo introduciendo `30` mostrará **los cinco importes históricos** del ejemplo correspondiente. Otra edad, origen, destino o fechas mostrarán «no hay una cotización real ni histórica» sin inventar precios. Esta vista interna no hace solicitudes de red a INTERWELT ni permite compras.

> Atención: El despliegue actual `interwelt-api-test` en Netlify publica `interwelt-pilot-site`, no la raíz del repositorio. Por eso este nuevo slot de `/resultados/` todavía **no se puede ver** en la URL de la preview actual. Se ha añadido al código del comparador para una futura validación de rama en un hosting de pruebas. No cambiar el `publish directory` del Netlify actual sin una revisión específica.

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
- Netlify Deploy Preview de la rama: **Success**. Este resultado valida el despliegue del laboratorio, no la publicación del `/resultados/` de esta rama.
