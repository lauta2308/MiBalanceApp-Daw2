# Test run FEAT-001c

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `npx vitest run --coverage --coverage.reporter=text-summary` |
| Total | 220 |
| Passed | 220 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 96.16% |
| Branch coverage | 89.45% |
| Function coverage | 96.35% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Clon del repositorio en el disco de Linux (WSL), rama `feat/FEAT-001c-elegir-categoria-fecha`, árbol limpio sobre `06bba7e` (los 4 bloques commiteados).
- Un solo comando corre los dos proyectos de Vitest: `unidad` (20 archivos, 200 pruebas, sin red) e `integracion` (3 archivos, 20 pruebas, contra Supabase con `.env.local` y las migraciones aplicadas).
- Las pruebas de integración crean usuarios anónimos marcados con `es_prueba = true`; se borran con `supabase/scripts/limpiar_usuarios_prueba.sql`.
- Statements: 94.62%.

## Failures
(none)

## Skips
(none)
