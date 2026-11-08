# Decisiones de FEAT-001a

Formato: decisión — quién la aprobó — fecha — bloque.

- `clienteSupabase.js` valida `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` al importarse y lanza un error si falta alguna, sin valores por defecto; los tests que lo importen lo simulan o usan `vi.stubEnv` — usuario — 2026-11-08 — Block 1
- Una moneda inválida lanza el mismo error `Formato de saldo inválido` — usuario — 2026-11-08 — Block 1
- 7 tests agregados a los requeridos por la spec: clave faltante, variable vacía, retorno de la configuración, creación del cliente, cliente no creado si falta una variable, decimales ya completos y enteros de tres dígitos — usuario — 2026-11-08 — Block 1
- `eslint.config.js` ignora `.daw/`, `.claude/` y las carpetas de runtime de DAW — usuario — 2026-11-08 — Block 1
- El div de montaje de `index.html` se llama `raiz` — usuario — 2026-11-08 — Block 1
- `.gitignore` ignora también `.env` y `.env.*.local`, además del `.env.local` que pide la spec — usuario — 2026-11-08 — Block 1
- El proveedor de cobertura `@vitest/coverage-v8` se instala en su última versión estable al cerrar CODE, porque la spec no lo lista y el cierre exige medir cobertura — usuario — 2026-11-08 — cierre de CODE
- No se agrega al Block 1 un caso de precisión de más de 17 dígitos: la garantía de que `FormatearSaldo` no usa float queda en la revisión del código — usuario — 2026-11-08 — Block 1
- Los tests de formato del Block 1 no nombran AC-01: lo nombran los tests de los Blocks 2 y 4 — usuario — 2026-11-08 — Block 1
- `id` con default `gen_random_uuid()` también en `BAT_CATEGORIAS` y `BAT_MOVIMIENTOS` — usuario — 2026-11-08 — Block 2
- `BACK_MOVIMIENTOS_TIPO` acepta `INGRESO` y `GASTO`, igual que `BACK_CATEGORIAS_TIPO` — usuario — 2026-11-08 — Block 2
- Nombres propios SQL en MAYÚSCULAS también en `revoke`, políticas y comentario de rollback — usuario — 2026-11-08 — Block 2
- `CrearUsuarioPrueba()` devuelve `{ cliente, usuario }` y lanza un error si falla el alta — usuario — 2026-11-08 — Block 2
- Se agrega `ObtenerVariablesFaltantesPruebas()` para que el aviso nombre la variable faltante — usuario — 2026-11-08 — Block 2
- Tests agregados a los requeridos: configuración con ambas variables, URL y clave faltantes por separado, y `es_prueba` con almacenamiento propio — usuario — 2026-11-08 — Block 2
- Las pruebas contra Supabase comparten los usuarios A y B de un `beforeAll` (2 usuarios por corrida), por el límite de inicios anónimos por IP — usuario — 2026-11-08 — Block 2
- Las constantes de módulo se escriben en MAYÚSCULAS_CON_GUIONES; AGENTS.md no las menciona y la spec ya usa ese estilo — usuario — 2026-11-08 — Block 2
- Si falla la lectura de la sesión guardada se muestra el mensaje de error y no se crea otro usuario — usuario — 2026-11-08 — Block 3
- La prop del texto de `MensajeError` se llama `mensaje` y el componente se exporta por defecto — usuario — 2026-11-08 — Block 3
- `signInAnonymously` no aparece en ningún otro archivo de `src`, tests incluidos — usuario — 2026-11-08 — Block 3
- `pruebas/sesionPersistente.test.js` arma su propio cliente con almacenamiento compartido, porque `CrearClientePrueba` no lo acepta; `CrearAlmacenamientoEnMemoria` se exporta de `ayudantesPruebas.js` para no duplicarlo — usuario — 2026-11-08 — Block 3
- 17 tests agregados a los requeridos por la spec — usuario — 2026-11-08 — Block 3
- Una respuesta sin sesión y sin error se trata como error de inicio de sesión — usuario — 2026-11-08 — Block 3
- `AsegurarSesion` libera la promesa al terminar, con éxito o con error — usuario — 2026-11-08 — Block 3
- `MensajeError` no gestiona el foco: el uso solo con teclado (RNF-08) está fuera de alcance de este PRD y se resuelve en su ticket — usuario — 2026-11-08 — Block 3

## Pendientes para FEAT-001b

Surgieron en la revisión del Block 2 y solo se pueden resolver cuando existan altas de movimientos.

- AC-27 no prueba `BAPOL_MOVIMIENTOS_PROPIETARIO`: el usuario B no tiene movimientos, así que la consulta da 0 filas con o sin RLS. Reforzarlo sembrando un movimiento real de B.
- Comprobar que borrar un usuario con movimientos funciona y que borrar una categoría en uso sigue rechazado (`BAFK_MOVIMIENTOS_CATEGORIA`).
- El esquema no impide que un movimiento apunte a una categoría de otra cuenta o de otro tipo: cada `BASP_` debe validarlo y probarlo.
