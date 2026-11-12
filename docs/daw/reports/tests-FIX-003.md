# Test run FIX-003

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `npx vitest run --project unidad --coverage --coverage.reporter=text-summary` |
| Total | 226 |
| Passed | 226 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 96.96% |
| Branch coverage | 90.05% |
| Function coverage | 97.1% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Rama `fix/FIX-003-gitignore-vs` sobre `3198913`, con el cambio de `.gitignore` sin commitear.
- Solo el proyecto `unidad` (21 archivos). El proyecto `integracion` no se seleccionó: el cambio solo toca `.gitignore`, no la app ni la base, y la suite completa contra Supabase corrió hoy en el cierre de FEAT-001d (254/254, `tests-FEAT-001d.md`).
- Prueba de regresión del fix-brief: `git check-ignore .vs/ coverage/` salió con código 1 sin listar nada antes del cambio y con código 0 listando las dos rutas después.
- Statements: 95.57%. Ramas: 317/352.

## Failures
(none)

## Skips
(none)
