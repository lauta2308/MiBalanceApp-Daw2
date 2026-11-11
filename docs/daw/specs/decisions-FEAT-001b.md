# Decisiones de FEAT-001b

Formato: decisión — quién la aprobó — fecha — bloque.

- AC-31 se prueba con el script manual `supabase/scripts/pruebas_movimientos.sql` y una prueba de UI con la API simulada, sin caminos de prueba en la función de producción (ADR-003) — usuario — 2026-11-11 — PLAN
- La autonomía del ticket es `minimal` — usuario — 2026-11-11 — CLASSIFY
- Las pruebas de rechazo de la función comparan el código y el texto exacto del mensaje; `test_sin_sesion_rechazado_api` compara solo el código 42501, porque PostgREST rechaza antes de entrar a la función — orquestador (modo minimal) — 2026-11-11 — Block 1
- Las pruebas de integración usan la fecha fija `2026-11-11` (`FECHA_MOVIMIENTO_PRUEBA` en `ayudantesPruebas.js`) — orquestador (modo minimal) — 2026-11-11 — Block 1
- El caso (a) del script da PASÓ solo si el error capturado es el del trigger temporal, para que una falla por otro motivo no dé un PASÓ falso — orquestador (modo minimal) — 2026-11-11 — Block 1
- Los usuarios del script se crean con `is_anonymous = true` y `es_prueba`, para que `limpiar_usuarios_prueba.sql` los borre si alguno quedara — orquestador (modo minimal) — 2026-11-11 — Block 1
- Un usuario sin cuenta se rechaza en la comprobación de categoría (paso 4) y no con una comprobación propia, para respetar el orden fijo de la spec — orquestador (modo minimal) — 2026-11-11 — Block 1
- El script guarda cada resultado en la tabla temporal `resultados_pruebas` y termina con un `select`, porque el SQL Editor de Supabase puede no mostrar los `raise notice` — orquestador (modo minimal) — 2026-11-11 — Block 1
- La llamada al RPC en las pruebas vive en un solo ayudante, `AgregarMovimiento`, en `pruebas/ayudantesPruebas.js` — orquestador (modo minimal) — 2026-11-11 — Block 1
- Pendiente para FEAT-001d: un monto de 10^12 o más pasa la validación de `BASP_AGREGAR_MOVIMIENTO` y falla en el insert con 22003 (mensaje técnico de PostgreSQL) en lugar de 22023. No deja estado parcial. El tope del monto es de FEAT-001d y no se inventa aquí — orquestador (modo minimal), a confirmar por el usuario — 2026-11-11 — Block 1
