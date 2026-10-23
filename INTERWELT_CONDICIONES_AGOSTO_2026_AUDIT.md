# INTERWELT — auditoría de Condiciones Generales (agosto de 2026)

**Ámbito:** únicamente la rama de pruebas del comparador. Documento revisado: `CONDICIONES GENERALES ACTUALIZADA AGOSTO 2026.pdf`, 56 páginas, creación del PDF 20-08-2026. Este archivo fue proporcionado directamente por ViajeroLatam. **NO se ha subido el PDF al repositorio ni existe todavía una URL pública verificada de esta edición**.

## Hallazgos confirmados en el propio PDF

| Página PDF | Hallazgo | Regla de visualización |
| --- | --- | --- |
| 3, 5 | Se comercializa como **asistencia al viajero**, no como seguro médico integral; la atención cubre cuadros agudos/imprevistos y los límites dependen del voucher | Mantener la categoría «Asistencia en Viaje» y avisar que las coberturas no son ilimitadas |
| 6–7 | El contrato empieza/termina según las fechas del voucher, con límite de asistencia al regresar a residencia; restricciones a modificaciones tras comenzar | No prometer continuidad automática o cambios libres |
| 7–8 | Extensiones requieren solicitud al canal emisor **mínimo 3 días corridos antes** y aprobación de INTERWELT; no se pueden aumentar coberturas. Compras en destino o extensiones tardías: **5 días de carencia** | Indicar carencia y aprobación, no prometer extensión |
| 8 | Para COVID-19 en ventas en destino/extensiones aprobadas, se fija carencia **específica de 7 días** | No simplificar toda carencia como 5 días |
| 8–9 | Comunicar incidencias y solicitar autorización de la Central; en urgencia que impida avisar previamente, informar cuanto antes, normalmente dentro de **24 h** | Aviso de autorización y contacto temprano |
| 13–14 | Límites en USD o EUR según voucher; preexistencia puede definirse aunque el viajero desconozca el padecimiento; topes por beneficio **no son acumulables** | No confundir precio de la API (USD) con moneda de cobertura |
| 15–16 | Viajes de larga estadía y multiviajes tienen reglas particulares; no todos los beneficios están incluidos en todos los planes | No vender los límites de todos los planes como equivalentes |
| 21–22 | Preexistencias/crónicas: solo si se adquiere ese beneficio y se encuentra expresamente en el voucher, la atención se limita a primera urgencia de descompensación imprevista, dentro de tope específico. Se excluyen tratamientos continuados, trasplantes y otras patologías | Resumen claro de preexistencias; sin garantías genéricas de cobertura |
| 22 | Para ciertos antecedentes el PDF exige consultar médico y confirmación escrita de aptitud para viajar; tras cirugía en últimos 90 días exige consentimiento escrito | Advertencia general, sin emitir juicios médicos sobre elegibilidad individual |
| 25–26 | Repatriación depende de autorización y evaluación de la Central; puede excluirse si la causa es una preexistencia fuera del beneficio específico | Los «topes de repatriación» no significan reembolso automático |
| 29–30 | La indemnización por pérdida de equipaje es complementaria, se relaciona con lo pagado por la aerolínea, requiere PIR y compensación previa; se excluye equipaje de cabina y pérdida parcial | Aviso en detalle de equipaje |
| 51–54 | Exclusiones generales extensas: preexistentes, crónicas, controles programados, patologías específicas, trasplantes, ciertos deportes, acciones bélicas y tratamientos no autorizados | No afirmar que una cifra médica significa cobertura universal |
| 56 | El contrato contempla franquicia cuando la incluya el plan y plazos específicos de reclamo; en Panamá se estipula jurisdicción | No mostrar «sin franquicia», «cancelación libre» o «reembolso garantizado» sin validación del producto |

## Diferencias y precauciones que NO se deben resolver por inferencia

1. La respuesta comercial de octubre de 2026 resumía una carencia de **5 días**; el condicionado de agosto precisa **7 días para COVID-19** en ciertas ventas en destino y extensiones. Ambas reglas deben explicarse con su propio supuesto.
2. **Precio** por `/api/quotes`: siempre USD, según correo de producción. **Límites de cobertura**: USD/EUR dependiendo del voucher, producto y destino, confirmados en el PDF y en la respuesta comercial.
3. El PDF y la web pública contienen condiciones de cancelación/solicitud de reembolso potencialmente distintas según canal y momento. Evitar mensajes de cancelación o devolución automáticos. Solicitar confirmación escrita específica **para ventas vía API de ViajeroLatam** antes de activar el checkout.
4. El condicionado establece amplias exclusiones para **tratamientos de trasplantes, enfermedades hepáticas, compromisos inmunitarios**, y otras condiciones, incluso si se menciona un beneficio limitado de preexistencias. No concluir que un viajero con estos antecedentes queda cubierto sin evaluación contractual individual de INTERWELT.
5. La **cobertura de equipaje** reflejada en el portafolio es un límite máximo, no una indemnización directa ni automática.
6. La autorización comercial para publicar condiciones no equivale a tener una **URL pública verificable de la edición agosto 2026**. No usar PDF de 2021/2024 como sustituto.
7. El hecho de que INTERWELT indique que sus planes cumplen requisitos Schengen no constituye un aval independiente. Mostrar la declaración atribuida y la necesidad de verificar el certificado de cada plan.
8. Las coberturas numéricas de la tarjeta provienen del **PORTAFOLIO.xlsx y aclaración comercial**, no de este PDF general, que explica cómo se aplican y excluyen.

## Cambios de aplicación en el preview

- `assets/vl-interwelt-results.js`: añadir advertencias verificadas dentro de «Ver detalles del plan», sin forzar su despliegue para todo visitante de forma invasiva.
- Mantener `LIVE_ENABLED=false` en frontend.
- Mantener `INTERWELT_PUBLIC_RATES_ENABLED=false` y `INTERWELT_PILOT_ENABLED=false` en Netlify.
- No crear cotizaciones reales ni introducir medios de pago o emisión de voucher.
- Probar automatizadamente la existencia de avisos sobre carencias 5/7 días, preexistencias y equipaje.
- Antes de publicar oficialmente, alojar la **misma edición de agosto de 2026** en URL estable o conseguir URL del proveedor, confirmar versionado y condiciones para cada plan y canal, y añadir consentimiento previo a la compra.

**Nota:** Este registro es una revisión técnica/comercial del documento aportado, no un dictamen jurídico ni un compromiso de cobertura de INTERWELT.
