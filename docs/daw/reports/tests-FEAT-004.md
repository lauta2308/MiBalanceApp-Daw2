# Test run FEAT-004

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `npx vitest run --project unidad --coverage --coverage.reporter=text-summary` |
| Total | 245 |
| Passed | 245 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 97% |
| Branch coverage | 90.16% |
| Function coverage | 97.1% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Clon del repositorio en el disco de Linux (WSL), rama `feat/FEAT-004-dependabot`, con el Block 1 (`.github/dependabot.yml` y `src/dependabot.test.js`) sin commitear todavía.
- Se corre solo el proyecto `unidad` (22 archivos, 245 pruebas, sin red), que es lo que corre el CI (`npm test`). El ticket no cambia código de la aplicación ni del esquema, así que el proyecto `integracion` (contra Supabase) no se corre: gastaría inicios de sesión anónimos, limitados a ~30 por hora por IP, sin cubrir nada de este ticket.
- Pruebas nuevas: las 11 de `src/dependabot.test.js`. `test_ci_acciones_fijadas_por_sha` (FEAT-002) sigue pasando.
- Statements: 95.63%.

## Failures
(none)

## Skips
(none)
