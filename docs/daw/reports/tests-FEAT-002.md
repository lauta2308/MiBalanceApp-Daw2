# Test run FEAT-002

| Field | Value |
|---|---|
| Runner | Vitest 5.1.0 (Node 22.23.2, Linux) |
| Command | `unshare -rn sh -c 'ip link set lo up && env -u VITE_SUPABASE_URL -u VITE_SUPABASE_ANON_KEY npx vitest run --project unidad --coverage --coverage.reporter=text-summary'` |
| Total | 115 |
| Passed | 115 |
| Failed | 0 |
| Skipped | 0 |
| Line coverage | 94.85% |
| Branch coverage | 87.24% |
| Function coverage | 94.66% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

## Entorno de la corrida

- Corrida sobre una copia del repositorio en el disco de Linux, sincronizada a partir del commit `2008d37` (`src/`, `.github/`, `package.json`, `vite.config.js`, `eslint.config.js`, `index.html`; `diff -rq` sin diferencias). Desde `/mnt/c` Vitest no llega a arrancar porque cargar jsdom desde el disco de Windows tarda más que su espera de 60 s.
- Red cortada (`unshare -rn`, solo loopback), sin `.env.local` y sin variables `VITE_SUPABASE_*`, para comprobar AC-07 y AC-08.
- 9 archivos de prueba: los 7 existentes, `src/bloqueoRedPruebas.test.js` (23 pruebas) y `src/integracionContinua.test.js` (15 pruebas).
- Statements: 92.42%.

## Failures
(none)

## Skips
(none)
