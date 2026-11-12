# Test run FEAT-001d

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `npx vitest run --coverage --coverage.reporter=text-summary` |
| Total | 254 |
| Passed | 254 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 96.74% |
| Branch coverage | 89.97% |
| Function coverage | 96.66% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Clon del repositorio en el disco de Linux (WSL), rama `feat/FEAT-001d-monto-limites`, sobre `ff7d9a0` (los 4 bloques commiteados).
- Un solo comando corre los dos proyectos de Vitest: `unidad` (21 archivos, 226 pruebas, sin red) e `integracion` (3 archivos, 28 pruebas, contra Supabase con `.env.local`).
- La migración `20261112000001_limites_movimiento.sql` la aplicó el usuario en el SQL Editor de Supabase antes de la corrida.
- Las pruebas de integración crean usuarios anónimos marcados con `es_prueba = true`; se borran con `supabase/scripts/limpiar_usuarios_prueba.sql`.
- Statements: 95.41%.

## Failures
(none)

## Skips
(none)
