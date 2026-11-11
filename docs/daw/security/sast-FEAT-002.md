# SAST FEAT-002

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| Tools | revisión manual con búsquedas (grep) sobre los archivos cambiados, ESLint 10.14.0, npm audit (npm 10) |
| Date | 2026-11-10 |
| Alcance | `src/bloqueoRedPruebas.js`, `src/bloqueoRedPruebas.test.js`, `src/configuracionPruebas.js`, `src/integracionContinua.test.js`, `.github/workflows/ci.yml`, `AGENTS.md`; dependencias de `package-lock.json` (sin cambios en este ticket) |

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves, tokens ni URLs de Supabase en los archivos cambiados; `ci.yml` no lee `secrets.*` ni define `env`; `.env`, `.env.local` y `.env.*.local` están en `.gitignore` y solo `.env.example` está versionado |
| F-SAST-02 | ✅ | no hay consultas SQL ni NoSQL en los archivos cambiados |
| F-SAST-03 | ✅ | nada llega a `exec`/`spawn`; ningún paso `run` de `ci.yml` interpola `${{ }}` (R-03), y una prueba lo vigila |
| F-SAST-04 | ✅ | sin `eval`, `new Function` ni deserialización insegura; `JSON.parse` solo sobre `package.json` del propio repo en una prueba |
| F-SAST-05 | ✅ | `readFileSync` solo en `src/integracionContinua.test.js` con rutas fijas relativas al módulo; sin entrada del usuario |
| F-SAST-06 | ✅ | no se genera HTML; sin `innerHTML` ni `dangerouslySetInnerHTML` |
| F-SAST-07 | ✅ | no se agregan llamadas salientes; el Block 1 rechaza toda conexión externa en las pruebas unitarias |
| F-SAST-08 | ✅ | no se usa criptografía |
| F-SAST-09 | ✅ | el código nuevo es solo de pruebas y CI; no hay modo debug ni `debugger` |
| F-SAST-10 | ✅ | sin `console.*`; el registro de intentos guarda solo protocolo, host, puerto y nombre de prueba, nunca contenido ni URL completa (R-08) |
| F-SAST-11 | ✅ | no hay superficie de subida de archivos |
| F-SAST-12 | ✅ | no hay formularios ni operaciones que cambien estado en el servidor |
| F-SAST-13 | ✅ | npm audit: 0 Critical, 0 High |
| F-SAST-14 | ✅ | el bloqueo trata como externa toda forma de argumentos que no reconoce |
| F-SAST-15 | ✅ | los errores del bloqueo muestran solo destino y prueba, sin trazas internas ni datos del entorno |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249) vía `eslint` 10.14.0, `@eslint/config-array` 0.23.5 y `@eslint/js` (dependencias de desarrollo), `node_modules/minimatch/package.json:1`; suprimido como riesgo aceptado, ver abajo |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | node_modules/minimatch/package.json:1 (requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, declarados en `package.json` como devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro |
| Date | 2026-11-10 |
| Justification | Es preexistente y solo afecta a ESLint en desarrollo y CI, no a la app publicada. Los patrones que procesa vienen de `eslint.config.js`, código del repositorio. La única corrección disponible baja ESLint a la versión 9, contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15`, token de solo lectura, sin secretos ni credenciales persistidas; un patrón malicioso en un pull request solo puede trabar esa ejecución hasta el límite, y el cambio a `eslint.config.js` se ve en la revisión del pull request. |
| Review by | 2027-05-10, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 1 vulnerability (0 critical, 0 high, 1 medium suppressed)
Result: PASSED
