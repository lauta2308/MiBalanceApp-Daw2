# Test run FEAT-001e

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `npx vitest run --coverage --coverage.reporter=text-summary` |
| Total | 263 |
| Passed | 263 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 96.78% |
| Branch coverage | 90.08% |
| Function coverage | 96.66% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Clon del repositorio en el disco de Linux (WSL), rama `feat/FEAT-001e-formulario-mensajes`, sobre `b540450` (los 3 bloques commiteados: `c50a7a8`, `d7a62ab`, `789c834`; después solo cambiaron documentos).
- Re-cierre de CODE tras el bucle correctivo de VERIFY, que solo cambió el formato de los nombres de las pruebas requeridas en la spec. La corrida anterior, sobre `789c834`, dio el mismo resultado: 263/263 y la misma cobertura.
- Un solo comando corre los dos proyectos de Vitest: `unidad` (21 archivos, 234 pruebas, sin red) e `integracion` (3 archivos, 29 pruebas, contra Supabase con `.env.local`).
- Sin migraciones nuevas en este ticket: el esquema es el de FEAT-001d.
- Las pruebas de integración crean usuarios anónimos marcados con `es_prueba = true`; se borran con `supabase/scripts/limpiar_usuarios_prueba.sql`.
- Statements: 95.47%.

## Failures
(none)

## Skips
(none)
