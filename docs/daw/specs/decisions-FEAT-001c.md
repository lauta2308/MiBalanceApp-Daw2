# Decisiones de FEAT-001c

Formato: decisión — quién la aprobó — fecha — bloque.

- La autonomía del ticket es `minimal` — usuario — 2026-11-11 — CLASSIFY
- El calendario navega con selectores de mes y año desde enero de 1900 hasta el mes actual, además de las flechas; 1900 es un límite de navegación, no una fecha mínima de la regla (FR-07 se cumple porque la API acepta cualquier fecha) — usuario — 2026-11-11 — PLAN
- Las categorías se ordenan en el cliente con `Intl.Collator('es', { sensitivity: 'base' })` y no en SQL (ADR-004) — orquestador (modo minimal) — 2026-11-11 — PLAN
- El calendario se abre desde un botón con la fecha y se cierra al elegir un día, en la misma página (no es un diálogo modal) — orquestador (modo minimal) — 2026-11-11 — PLAN
- El bloque del calendario (W-SPEC-02) se dividió en dos: el componente `SelectorFecha` (Block 2) y su uso en el formulario (Block 3); no se dividió más porque los 7 archivos restantes son un solo componente con sus pruebas, sus estilos y la dependencia — orquestador (modo minimal) — 2026-11-11 — PLAN
- AC-10 y AC-11 con categorías propias ("Sueldo", "Ventas") se prueban con servicios simulados, porque el cliente no puede insertar categorías (solo `select` para `authenticated`); contra la API real se usa "Pago Ingresado" — orquestador (modo minimal) — 2026-11-11 — PLAN
- El riesgo R-03 (fecha futura alterada desde el navegador) queda aceptado hasta FEAT-001d, que el usuario asignó al aprobar la división de FEAT-001 el 2026-11-07 — usuario (división de FEAT-001) — 2026-11-11 — PLAN
- Advertencias del arch-auditor sobre la spec, resueltas en la spec antes de CODE: `ConvertirFechaATexto` nueva (y `ObtenerFechaHoy` la usa) en lugar de reutilizar `ObtenerFechaHoy` para cualquier día; el botón de la fecha lleva `aria-labelledby` con la etiqueta y la fecha; los meses del calendario van con mayúscula inicial por la regla de títulos de AGENTS.md; se acepta que una fecha inválida en `SelectorFecha` rompa el render, sin un límite de errores, porque su único origen produce siempre fechas válidas — orquestador (modo minimal) — 2026-11-11 — PLAN
