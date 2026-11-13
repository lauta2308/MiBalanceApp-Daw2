# Decisiones de FIX-004

Formato: decisión — quién la aprobó — fecha — fase.

- Corregir solo el punto 1 del análisis de dependencias (date-fns en `AGENTS.md`); Playwright y axe-core quedan como están hasta que se escriban esas pruebas — usuario ("modifiquemos en agents el punto 1") — 2026-11-13 — CLASSIFY
- Texto nuevo de `AGENTS.md`:9: "react-day-picker (calendario; trae date-fns como dependencia propia, el código no la importa)" — usuario (confirmó la clasificación con el diff a la vista) — 2026-11-13 — CLASSIFY
- La autonomía del ticket es `minimal` — usuario — 2026-11-13 — CLASSIFY
- Las pruebas del cierre corren solo el proyecto `unidad` más la regresión con `grep` y `npm ls date-fns`; la integración contra Supabase no se repite porque el cambio es documentación — orquestador (modo minimal) — 2026-11-13 — CODE
- La supresión de F-SAST-16 (`minimatch` vía ESLint) se renueva sin cambios — orquestador (modo minimal) — 2026-11-13 — CODE
