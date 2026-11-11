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
- `MENSAJE_MONTO_INVALIDO` vale 'El monto debe ser mayor a 0.', literal de FR-07 / AC-18 — orquestador (modo minimal) — 2026-11-11 — Block 2
- `AgregarIngreso` descarta el id que devuelve la RPC y solo lanza el error si lo hay — orquestador (modo minimal) — 2026-11-11 — Block 2
- `ValidarMonto` devuelve `null` también si recibe algo que no es texto, sin lanzar — orquestador (modo minimal) — 2026-11-11 — Block 2
- Las constantes de `formatoMoneda.js` pasan a MAYÚSCULAS (`FORMATO_SALDO`, `FORMATO_CODIGO_MONEDA`, `POSICIONES_SEPARADOR_MILES`), según la decisión de FEAT-001a — orquestador (modo minimal) — 2026-11-11 — Block 2
- `test_fecha_hoy_local` fija `TZ=America/Argentina/Buenos_Aires` y controla `getTimezoneOffset()`, para detectar una regresión a UTC aunque la suite corra en UTC — orquestador (modo minimal) — 2026-11-11 — Block 2
- Cada `it(...)` nuevo lleva el prefijo `test_`, también las pruebas extra a las requeridas — orquestador (modo minimal) — 2026-11-11 — Block 2
- La prueba de FEAT-001a `sesion.test.js` > "crea un solo usuario anónimo…" supera a veces los 5000 ms con la suite completa en WSL sobre /mnt/c (2 de 3 corridas); se corrige en el cierre de CODE precargando el import, sin aflojar aserciones — orquestador (modo minimal) — 2026-11-11 — Block 2
- `react-router` 8.5.1, última estable según `npm view` — orquestador (modo minimal) — 2026-11-11 — Block 3
- La categoría preseleccionada sale de `es_defecto`, no de la posición en la lista — orquestador (modo minimal) — 2026-11-11 — Block 3
- Los mensajes de validación y de error del alta se muestran sobre el formulario, que sigue montado con los datos cargados — orquestador (modo minimal) — 2026-11-11 — Block 3
- Durante el reintento de carga de categorías "Aceptar" queda deshabilitado y una ref evita la carga doble de `StrictMode`, igual que en `SeccionCuenta` — orquestador (modo minimal) — 2026-11-11 — Block 3
- La fecha del formulario se calcula una sola vez al montar (`useState(() => ObtenerFechaHoy())`) — orquestador (modo minimal) — 2026-11-11 — Block 3
- La categoría elegida es `null` hasta que el usuario cambia el `select` y mientras tanto se usa la por defecto, para cumplir `react-hooks/set-state-in-effect` — orquestador (modo minimal) — 2026-11-11 — Block 3
- La función que devuelve `useNavigate()` se llama `Navegar` (PascalCase), por analogía con el setter de `useState` — orquestador (modo minimal) — 2026-11-11 — Block 3
- `test_ruta_desconocida_redirige` comprueba además que la ruta queda en "/", porque solo mirar la sección Cuenta pasaba antes de implementar — orquestador (modo minimal) — 2026-11-11 — Block 3
