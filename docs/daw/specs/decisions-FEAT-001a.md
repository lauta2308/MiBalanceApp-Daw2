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
