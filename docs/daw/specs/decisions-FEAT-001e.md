# Decisiones de FEAT-001e

Formato: decisión — quién la aprobó — fecha — bloque.

- La autonomía del ticket es `minimal` — usuario — 2026-11-12 — CLASSIFY
- El doble envío se evita en el cliente (guardia por referencia y `fieldset` deshabilitado), sin clave de idempotencia en el servidor (ADR-006) — orquestador (modo minimal) — 2026-11-12 — PLAN
- Riesgo aceptado R-05: el "atrás" del navegador no se bloquea durante el alta; bloquearlo exige un router de datos (`useBlocker`) — usuario — 2026-11-12 — PLAN
- Riesgo aceptado R-06: "Guardando…" no tiene tiempo máximo; agregarlo sería un requisito nuevo que el PRD no tiene — usuario — 2026-11-12 — PLAN
- Advertencias del arch-auditor resueltas en la spec antes de CODE: el segundo envío de las pruebas de doble clic se dispara con `fireEvent.submit(form)` para que ejercite la guardia y no solo el botón deshabilitado; la prueba de los 10 s usa temporizadores falsos completos; la de AC-25 comprueba el mensaje antes del clic y no depende de los 3 s reales; `test_guardando_deshabilita_formulario` también revisa el calendario abierto; el reset del `fieldset` lleva `margin: 0` y `min-inline-size: 0`; el modelo de amenazas cita los nombres de prueba de la spec — orquestador (modo minimal) — 2026-11-12 — PLAN
- W-SPEC-01 (Block 3 sin FR) y W-SPEC-02 (Block 1 y Block 2 grandes) se aceptan: Block 3 es la prueba de NFR-01 (AC-32); Block 1 es un solo componente con su estilo y sus pruebas, y Block 2 es solo de pruebas — orquestador (modo minimal) — 2026-11-12 — PLAN
- Se acepta la duplicación de `CrearPromesaControlada` y `ConvertirMontoACentavos` en archivos de prueba (INFO del arch-auditor); un módulo compartido de ayudantes de prueba queda para otro ticket — orquestador (modo minimal) — 2026-11-12 — PLAN
- Pérdida de foco al deshabilitar "Guardar" (INFO del arch-auditor): RNF-08 está fuera del alcance de este PRD; queda para el ticket de uso con teclado — orquestador (modo minimal) — 2026-11-12 — PLAN
