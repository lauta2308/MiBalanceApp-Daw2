# Test run FEAT-001b

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `npx vitest run --coverage --coverage.reporter=text-summary` |
| Total | 199 |
| Passed | 199 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 95.85% |
| Branch coverage | 88.77% |
| Function coverage | 95.9% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Clon del repositorio en el disco de Linux (WSL), rama `feat/FEAT-001b-registrar-ingreso`, árbol limpio sobre `cbc0853`.
- Un solo comando corre los dos proyectos de Vitest: `unidad` (18 archivos, 181 pruebas, sin red) e `integracion` (3 archivos, 18 pruebas, contra Supabase con `.env.local` y las migraciones aplicadas).
- Las pruebas de integración crean usuarios anónimos marcados con `es_prueba = true`; se borran con `supabase/scripts/limpiar_usuarios_prueba.sql`.
- Statements: 94.19%.

## Failures
(none)

## Skips
(none)
